(() => {
  const script = document.currentScript;
  const root = document.querySelector("#yuumi-flight-game");
  if (!script || !root) return;

  const loader = root.querySelector("#game-loader");
  const bar = root.querySelector("#game-loader-bar");
  const label = root.querySelector("#game-loader-label");
  const percent = root.querySelector("#game-loader-percent");
  const status = root.querySelector("#game-status");
  const start = root.querySelector("#game-start");
  let highestProgress = 8;

  const report = (value, text) => {
    const next = Math.max(highestProgress, Math.min(100, Math.round(Number(value) || 0)));
    highestProgress = next;
    bar.style.setProperty("--game-load-progress", `${next}%`);
    percent.textContent = `${String(next).padStart(2, "0")}%`;
    if (text) label.textContent = text;
    loader.setAttribute("aria-label", `${label.textContent}，${next}%`);
    if (next >= 100) {
      loader.classList.add("is-complete");
      window.setTimeout(() => { loader.hidden = true; }, 360);
    }
  };

  const fail = () => {
    root.dataset.assets = "error";
    status.textContent = "冬境引擎加载失败，请检查网络后重试";
    label.textContent = "LOAD INTERRUPTED";
    loader.dataset.tone = "error";
    start.disabled = false;
    start.textContent = "重新加载";
    start.addEventListener("click", () => location.reload(), { once: true });
  };

  window.LHYZS_GAME_LOADING = Object.freeze({ report, fail });
  report(8, "正在唤醒冬境引擎");

  const engine = document.createElement("script");
  engine.src = new URL(script.dataset.gameScript, document.baseURI).href;
  engine.async = true;
  engine.addEventListener("load", () => report(28, "引擎就绪 · 正在绘制角色"), { once: true });
  engine.addEventListener("error", fail, { once: true });
  document.head.append(engine);
})();
