#!/usr/bin/env python3
"""Run a loopback-only daily deployment endpoint during ``mkdocs serve``."""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path, PurePosixPath
from typing import Any
from urllib.parse import parse_qs, urlsplit


DEPLOY_HOST = "127.0.0.1"
DEPLOY_PORT = int(os.environ.get("LHYZS_DEPLOY_PORT", "8765"))
MAX_BODY_BYTES = 1_000_000
MAX_FILES = 200
MAX_TITLE_LENGTH = 60
TERMINAL_STATES = {"success", "failed"}
ACTIVE_STATES = {"queued", "validating", "committing", "pushing", "waiting", "deploying"}
DATA_FILES = {"daily/qzone.json", "daily/photo-manifest.json"}
IMAGE_PREFIX = "assets/images/daily/"
LOOPBACK_HOSTS = {"127.0.0.1", "localhost", "::1"}


class DeployError(RuntimeError):
    """Raised when a daily deployment cannot continue."""


def _command(args: list[str], cwd: Path, timeout: int = 180) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"
    env["PYTHONUTF8"] = "1"
    return subprocess.run(
        args,
        cwd=cwd,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=timeout,
        env=env,
        check=False,
    )


def _output(result: subprocess.CompletedProcess[str]) -> str:
    return "\n".join(part.strip() for part in (result.stdout, result.stderr) if part and part.strip())


def _short_output(result: subprocess.CompletedProcess[str], limit: int = 700) -> str:
    output = _output(result)
    return output[-limit:] if output else f"命令退出码 {result.returncode}"


def normalize_daily_files(raw_files: Any) -> list[str]:
    if raw_files is None:
        raw_files = []
    if not isinstance(raw_files, list):
        raise DeployError("部署文件列表格式不正确。")
    if len(raw_files) > MAX_FILES:
        raise DeployError("一次发布的文件过多，请分几次发布。")

    normalized: set[str] = set(DATA_FILES)
    for raw in raw_files:
        if not isinstance(raw, str):
            raise DeployError("部署文件路径格式不正确。")
        value = raw.strip().replace("\\", "/")
        path = PurePosixPath(value)
        if not value or path.is_absolute() or ".." in path.parts:
            raise DeployError("部署文件路径必须位于 docs 目录内。")
        name = path.as_posix()
        if name not in DATA_FILES and not name.startswith(IMAGE_PREFIX):
            raise DeployError(f"不允许部署这个文件：{name}")
        normalized.add(name)
    return sorted(normalized)


def clean_title(value: Any) -> str:
    if not isinstance(value, str):
        return ""
    title = re.sub(r"[\x00-\x1f\x7f]+", " ", value).strip()
    return title[:MAX_TITLE_LENGTH]


class DeploymentManager:
    def __init__(
        self,
        repo_root: Path,
        *,
        dry_run: bool = False,
        python: str | None = None,
        gh: str | None = None,
    ) -> None:
        self.repo_root = repo_root.resolve()
        self.dry_run = dry_run
        self.python = python or sys.executable
        self.gh = gh or shutil.which("gh") or "gh"
        self._lock = threading.Lock()
        self._state: dict[str, Any] = {
            "jobId": "",
            "state": "idle",
            "message": "等待发布。",
            "startedAt": None,
            "finishedAt": None,
            "sha": "",
            "runId": None,
            "runUrl": "",
            "files": [],
        }

    def snapshot(self) -> dict[str, Any]:
        with self._lock:
            return dict(self._state)

    def start(self, files: list[str], title: str) -> dict[str, Any] | None:
        with self._lock:
            if self._state["state"] in ACTIVE_STATES:
                return None
            job_id = f"deploy-{int(time.time() * 1000)}"
            self._state = {
                "jobId": job_id,
                "state": "queued",
                "message": "已加入上线队列。",
                "startedAt": time.time(),
                "finishedAt": None,
                "sha": "",
                "runId": None,
                "runUrl": "",
                "files": files,
            }
            worker = threading.Thread(
                target=self._run_job,
                args=(job_id, files, title),
                name="lhyzs-daily-deploy",
                daemon=True,
            )
            worker.start()
            return dict(self._state)

    def _update(self, job_id: str, state: str, message: str, **fields: Any) -> None:
        with self._lock:
            if self._state["jobId"] != job_id:
                return
            self._state.update(fields)
            self._state["state"] = state
            self._state["message"] = message
            if state in TERMINAL_STATES:
                self._state["finishedAt"] = time.time()

    def _run_job(self, job_id: str, files: list[str], title: str) -> None:
        try:
            self._update(job_id, "validating", "正在构建并校验站点…")
            self._run_checks()
            if self.dry_run:
                self._update(job_id, "success", "部署演练完成，未提交任何文件。")
                return

            self._update(job_id, "committing", "正在提交本次日常…")
            sha = self._commit(files, title)
            self._update(job_id, "pushing", "正在推送到 GitHub…", sha=sha)
            self._push()

            self._update(job_id, "waiting", "正在等待 Pages 构建…", sha=sha)
            run = self._wait_for_run(sha)
            self._update(
                job_id,
                "deploying",
                "Pages 正在部署，通常需要半分钟…",
                runId=run["databaseId"],
                runUrl=run.get("url", ""),
            )
            final = self._wait_for_deployment(int(run["databaseId"]))
            self._update(
                job_id,
                "success",
                "已发布并上线。",
                runUrl=final.get("url", run.get("url", "")),
            )
        except Exception as error:
            self._update(job_id, "failed", str(error) or "自动上线失败。")

    def _run_checks(self) -> None:
        with tempfile.TemporaryDirectory(prefix="lhyzs-deploy-check-") as temporary:
            site_dir = Path(temporary)
            commands = [
                ([self.python, "-m", "mkdocs", "build", "--strict", "--site-dir", str(site_dir)], "站点构建"),
                ([self.python, "scripts/content_pipeline.py", "check", "--site-dir", str(site_dir)], "内容校验"),
                ([self.python, "scripts/check_page_assets.py", "--site-dir", str(site_dir)], "页面资源校验"),
            ]
            for command, label in commands:
                try:
                    result = _command(command, self.repo_root)
                except subprocess.TimeoutExpired as error:
                    raise DeployError(f"{label}超时，请稍后重试。") from error
                if result.returncode != 0:
                    raise DeployError(f"{label}失败：{_short_output(result)}")

    def _commit(self, files: list[str], title: str) -> str:
        staged = _command(["git", "diff", "--cached", "--name-only"], self.repo_root)
        if staged.returncode != 0:
            raise DeployError(f"无法读取 Git 状态：{_short_output(staged)}")
        if staged.stdout.strip():
            raise DeployError("仓库里已有其他已暂存文件，请先处理后再一键上线。")

        repo_paths = [f"docs/{name}" for name in files]
        for path in repo_paths:
            full_path = self.repo_root / path
            if path.endswith(("qzone.json", "photo-manifest.json")) and not full_path.is_file():
                raise DeployError(f"缺少日常文件：{path}")

        added = _command(["git", "add", "-A", "--", *repo_paths], self.repo_root)
        if added.returncode != 0:
            raise DeployError(f"暂存日常文件失败：{_short_output(added)}")

        changed = _command(["git", "diff", "--cached", "--name-only"], self.repo_root)
        if changed.returncode != 0:
            raise DeployError(f"无法读取暂存内容：{_short_output(changed)}")
        changed_paths = {line.strip() for line in changed.stdout.splitlines() if line.strip()}
        if not changed_paths:
            raise DeployError("日常内容没有变化，无需上线。")
        unexpected = changed_paths - set(repo_paths)
        if unexpected:
            raise DeployError("暂存区出现了本次日常之外的文件，已停止上线。")

        message = f"发布日常：{title}" if title else "发布日常"
        committed = _command(["git", "commit", "-m", message], self.repo_root)
        if committed.returncode != 0:
            raise DeployError(f"提交失败：{_short_output(committed)}")
        sha = _command(["git", "rev-parse", "HEAD"], self.repo_root)
        if sha.returncode != 0 or not sha.stdout.strip():
            raise DeployError("提交成功，但无法读取提交编号。")
        return sha.stdout.strip()

    def _push(self) -> None:
        pushed = _command(["git", "push", "origin", "main"], self.repo_root, timeout=180)
        if pushed.returncode != 0:
            raise DeployError(f"推送 GitHub 失败：{_short_output(pushed)}")

    def _wait_for_run(self, sha: str) -> dict[str, Any]:
        deadline = time.monotonic() + 90
        while time.monotonic() < deadline:
            result = _command(
                [
                    self.gh,
                    "run",
                    "list",
                    "--workflow",
                    "deploy.yml",
                    "--commit",
                    sha,
                    "--limit",
                    "1",
                    "--json",
                    "databaseId,status,conclusion,url",
                ],
                self.repo_root,
                timeout=30,
            )
            if result.returncode == 0:
                try:
                    runs = json.loads(result.stdout or "[]")
                except json.JSONDecodeError:
                    runs = []
                if runs:
                    return runs[0]
            time.sleep(2)
        raise DeployError("已经推送，但没有找到对应的 GitHub Pages 工作流。")

    def _wait_for_deployment(self, run_id: int) -> dict[str, Any]:
        deadline = time.monotonic() + 240
        while time.monotonic() < deadline:
            result = _command(
                [self.gh, "run", "view", str(run_id), "--json", "status,conclusion,url"],
                self.repo_root,
                timeout=30,
            )
            if result.returncode != 0:
                raise DeployError(f"无法读取 Pages 部署状态：{_short_output(result)}")
            try:
                run = json.loads(result.stdout)
            except json.JSONDecodeError as error:
                raise DeployError("GitHub 返回了无法识别的部署状态。") from error
            if run.get("status") == "completed":
                if run.get("conclusion") == "success":
                    return run
                conclusion = run.get("conclusion") or "unknown"
                raise DeployError(f"Pages 部署失败（{conclusion}）。")
            time.sleep(3)
        raise DeployError("Pages 部署等待超时，请到 GitHub Actions 查看结果。")


class DeployHTTPServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def __init__(self, address: tuple[str, int], manager: DeploymentManager) -> None:
        self.manager = manager
        super().__init__(address, DeployRequestHandler)


class DeployRequestHandler(BaseHTTPRequestHandler):
    server_version = "LhyzsDailyDeploy/1.0"

    @property
    def manager(self) -> DeploymentManager:
        return self.server.manager  # type: ignore[attr-defined]

    def log_message(self, format: str, *args: Any) -> None:
        if os.environ.get("LHYZS_DEPLOY_DEBUG") == "1":
            super().log_message(format, *args)

    def _origin(self) -> str:
        return self.headers.get("Origin", "")

    def _origin_allowed(self) -> bool:
        origin = self._origin()
        if not origin:
            return True
        parsed = urlsplit(origin)
        return parsed.scheme in {"http", "https"} and parsed.hostname in LOOPBACK_HOSTS

    def _common_headers(self) -> None:
        origin = self._origin()
        if origin and self._origin_allowed():
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")

    def _send_json(self, status: int, payload: dict[str, Any]) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self._common_headers()
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:
        if not self._origin_allowed():
            self._send_json(403, {"message": "仅允许本机页面调用部署服务。"})
            return
        self.send_response(204)
        self._common_headers()
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        if self.headers.get("Access-Control-Request-Private-Network") == "true":
            self.send_header("Access-Control-Allow-Private-Network", "true")
        self.end_headers()

    def do_GET(self) -> None:
        parsed = urlsplit(self.path)
        if not self._origin_allowed():
            self._send_json(403, {"message": "仅允许本机页面调用部署服务。"})
            return
        state = self.manager.snapshot()
        if parsed.path == "/health":
            self._send_json(200, {"ok": True, "deploy": state})
            return
        if parsed.path == "/deploy-status":
            requested_job = parse_qs(parsed.query).get("job", [""])[0]
            if not requested_job or requested_job != state["jobId"]:
                self._send_json(404, {"message": "找不到这次上线任务。", "deploy": state})
                return
            self._send_json(200, state)
            return
        self._send_json(404, {"message": "Not found"})

    def do_POST(self) -> None:
        if urlsplit(self.path).path != "/deploy":
            self._send_json(404, {"message": "Not found"})
            return
        if not self._origin_allowed():
            self._send_json(403, {"message": "仅允许本机页面调用部署服务。"})
            return
        if not (self.headers.get("Content-Type") or "").lower().startswith("application/json"):
            self._send_json(415, {"message": "请求格式必须是 JSON。"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self._send_json(400, {"message": "请求长度无效。"})
            return
        if length <= 0 or length > MAX_BODY_BYTES:
            self._send_json(400, {"message": "请求内容为空或过大。"})
            return

        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            files = normalize_daily_files(payload.get("files"))
            title = clean_title(payload.get("title"))
        except (UnicodeDecodeError, json.JSONDecodeError, AttributeError):
            self._send_json(400, {"message": "请求内容无法解析。"})
            return
        except DeployError as error:
            self._send_json(422, {"message": str(error)})
            return

        state = self.manager.start(files, title)
        if state is None:
            current = self.manager.snapshot()
            self._send_json(409, {"message": "已有一条日常正在上线，请稍候。", **current})
            return
        self._send_json(202, state)


_deploy_server: DeployHTTPServer | None = None
_deploy_thread: threading.Thread | None = None
_deploy_manager: DeploymentManager | None = None
_deploy_lock = threading.Lock()


def start_deploy_server(repo_root: Path, port: int = DEPLOY_PORT) -> DeploymentManager | None:
    global _deploy_manager, _deploy_server, _deploy_thread
    with _deploy_lock:
        if _deploy_server is not None:
            return _deploy_manager
        manager = DeploymentManager(
            repo_root,
            dry_run=os.environ.get("LHYZS_DEPLOY_DRY_RUN") == "1",
        )
        try:
            server = DeployHTTPServer((DEPLOY_HOST, port), manager)
        except OSError as error:
            print(f"MkDocs daily deploy: cannot start {DEPLOY_HOST}:{port}: {error}", file=sys.stderr)
            return None
        thread = threading.Thread(
            target=server.serve_forever,
            name="lhyzs-daily-deploy-server",
            daemon=True,
        )
        thread.start()
        _deploy_manager = manager
        _deploy_server = server
        _deploy_thread = thread
        print(f"MkDocs daily deploy: listening on http://{DEPLOY_HOST}:{port}", file=sys.stderr)
        return manager


def on_serve(server: Any, config: Any, builder: Any) -> Any:
    config_path = getattr(config, "config_file_path", "") or "mkdocs.yml"
    start_deploy_server(Path(config_path).resolve().parent)
    return server


if __name__ == "__main__":
    root = Path(__file__).resolve().parent.parent
    active_manager = start_deploy_server(root)
    if active_manager is None:
        raise SystemExit(1)
    print(f"Daily deploy endpoint ready for {root}")
    try:
        while True:
            time.sleep(3600)
    except KeyboardInterrupt:
        pass
