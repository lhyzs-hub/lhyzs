(() => {
  const initDaily = async () => {
    const root = document.querySelector("#daily-space");
    if (!root || root.dataset.ready === "true") return;
    root.dataset.ready = "true";

    const timeline = root.querySelector("#daily-timeline");
    const notice = root.querySelector("#daily-space-notice");
    const postCount = root.querySelector("#daily-post-count");
    const photoCount = root.querySelector("#daily-photo-count");
    const ownerButton = root.querySelector("#daily-owner-edit");
    const editor = root.querySelector("#daily-editor");
    const form = root.querySelector("#daily-editor-form");
    const select = root.querySelector("#daily-editor-select");
    const fileButton = root.querySelector("#daily-editor-file");
    const fileStatus = root.querySelector("#daily-editor-file-status");
    const fields = {
      id: root.querySelector("#daily-editor-id"),
      type: root.querySelector("#daily-editor-type"),
      date: root.querySelector("#daily-editor-date"),
      content: root.querySelector("#daily-editor-content"),
      images: root.querySelector("#daily-editor-images")
    };

    const ownerHost = ["localhost", "127.0.0.1", "::1"].includes(location.hostname);
    let payload = { source: "QQ空间", cutoff: "2025-08-15T00:00:00+08:00", entries: [] };
    let fileHandle = null;

    const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
    })[char]);

    const dateLabel = (value) => new Intl.DateTimeFormat("zh-CN", {
      year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
    }).format(new Date(value));

    const monthKey = (value) => {
      const date = new Date(value);
      return `${date.getFullYear()}年 ${String(date.getMonth() + 1).padStart(2, "0")}月`;
    };

    const renderImages = (images = []) => {
      const safeImages = images.filter(Boolean);
      if (!safeImages.length) return "";
      return `<div class="daily-card__photos photos-${Math.min(safeImages.length, 4)}">
        ${safeImages.map((src, index) => `<button type="button" data-photo="${escapeHtml(src)}" aria-label="查看第 ${index + 1} 张照片"><img src="${escapeHtml(src)}" alt="" loading="lazy"></button>`).join("")}
      </div>`;
    };

    const render = () => {
      payload.entries = (payload.entries || []).sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
      postCount.textContent = String(payload.entries.length);
      photoCount.textContent = String(payload.entries.reduce((sum, entry) => sum + (entry.images || []).length, 0));
      select.innerHTML = `<option value="">选择一条记录…</option>${payload.entries.map((entry) => `<option value="${escapeHtml(entry.id)}">${escapeHtml(dateLabel(entry.date))} · ${escapeHtml(entry.content || entry.type)}</option>`).join("")}`;

      if (!payload.entries.length) {
        notice.hidden = false;
        notice.innerHTML = ownerHost
          ? "尚未导入 QQ 空间内容。完成二维码登录后，2025-08-15 之后的记录会显示在这里。"
          : "日常内容正在整理中。"
        timeline.innerHTML = "";
        return;
      }

      notice.hidden = true;
      let currentMonth = "";
      timeline.innerHTML = payload.entries.map((entry) => {
        const month = monthKey(entry.date);
        const monthHeading = month !== currentMonth ? `<h2 class="daily-timeline__month"><span>${escapeHtml(month)}</span></h2>` : "";
        currentMonth = month;
        return `${monthHeading}<article class="daily-card" data-entry-id="${escapeHtml(entry.id)}">
          <header class="daily-card__head">
            <img src="../assets/images/avatar.png" alt="" class="daily-card__avatar">
            <div><strong>lhyzs</strong><p>${escapeHtml(dateLabel(entry.date))} · ${escapeHtml(entry.source || "日常")}</p></div>
            ${ownerHost ? `<button class="daily-card__edit" type="button" data-edit-entry="${escapeHtml(entry.id)}">编辑</button>` : ""}
          </header>
          ${entry.content ? `<p class="daily-card__content">${escapeHtml(entry.content)}</p>` : ""}
          ${renderImages(entry.images)}
          <footer>
            <span>${escapeHtml(entry.type || "日常")}</span>
            <button class="daily-card__comments-toggle" type="button" data-comments-toggle data-page-key="daily/${escapeHtml(entry.id)}" aria-expanded="false">
              评论 <span data-comments-count aria-live="polite">…</span>
            </button>
          </footer>
          <div class="daily-card__comments" data-comments-host hidden></div>
        </article>`;
      }).join("");
      document.dispatchEvent(new CustomEvent("lhyzs:daily-rendered", { detail: { root } }));
    };

    const clearForm = () => {
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      fields.id.value = `daily-${Date.now()}`;
      fields.type.value = "日常";
      fields.date.value = now.toISOString().slice(0, 16);
      fields.content.value = "";
      fields.images.value = "";
      select.value = "";
    };

    const loadEntry = (id) => {
      const entry = payload.entries.find((item) => item.id === id);
      if (!entry) return clearForm();
      const date = new Date(entry.date);
      date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
      fields.id.value = entry.id;
      fields.type.value = entry.type || "日常";
      fields.date.value = date.toISOString().slice(0, 16);
      fields.content.value = entry.content || "";
      fields.images.value = (entry.images || []).join("\n");
      select.value = entry.id;
    };

    const writePayload = async () => {
      payload.generated_at = new Date().toISOString();
      const content = JSON.stringify(payload, null, 2);
      if (fileHandle) {
        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
        fileStatus.textContent = "已保存到 qzone.json";
      } else {
        const blob = new Blob([content], { type: "application/json" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "qzone.json";
        link.click();
        URL.revokeObjectURL(link.href);
        fileStatus.textContent = "已下载，请替换 docs/daily/qzone.json";
      }
    };

    try {
      const response = await fetch(`${root.dataset.source}?v=${Date.now()}`);
      if (response.ok) payload = await response.json();
    } catch (_) {}

    if (ownerHost) ownerButton.hidden = false;
    render();
    clearForm();

    ownerButton.addEventListener("click", () => {
      editor.hidden = false;
      document.body.classList.add("daily-editor-open");
    });
    editor.querySelectorAll("[data-editor-close]").forEach((button) => button.addEventListener("click", () => {
      editor.hidden = true;
      document.body.classList.remove("daily-editor-open");
    }));
    select.addEventListener("change", () => loadEntry(select.value));
    timeline.addEventListener("click", (event) => {
      const edit = event.target.closest("[data-edit-entry]");
      if (edit && ownerHost) {
        loadEntry(edit.dataset.editEntry);
        editor.hidden = false;
        document.body.classList.add("daily-editor-open");
      }
      const photo = event.target.closest("[data-photo]");
      if (photo) window.open(photo.dataset.photo, "_blank", "noopener,noreferrer");
    });
    root.querySelector("#daily-editor-new").addEventListener("click", clearForm);
    root.querySelector("#daily-editor-delete").addEventListener("click", async () => {
      const id = fields.id.value;
      if (!payload.entries.some((entry) => entry.id === id) || !confirm("确定删除这条日常记录吗？")) return;
      payload.entries = payload.entries.filter((entry) => entry.id !== id);
      await writePayload();
      render();
      clearForm();
    });
    fileButton.addEventListener("click", async () => {
      if (!("showOpenFilePicker" in window)) {
        fileStatus.textContent = "浏览器不支持直接写入，将改为下载文件";
        return;
      }
      [fileHandle] = await window.showOpenFilePicker({
        types: [{ description: "日常 JSON", accept: { "application/json": [".json"] } }],
        multiple: false
      });
      const file = await fileHandle.getFile();
      payload = JSON.parse(await file.text());
      fileStatus.textContent = `已授权：${file.name}`;
      render();
      clearForm();
    });
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const date = new Date(fields.date.value);
      const entry = {
        id: fields.id.value || `daily-${Date.now()}`,
        type: fields.type.value,
        timestamp: Math.floor(date.getTime() / 1000),
        date: date.toISOString(),
        content: fields.content.value.trim(),
        images: fields.images.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
        source: "本机编辑"
      };
      const index = payload.entries.findIndex((item) => item.id === entry.id);
      if (index >= 0) payload.entries[index] = entry;
      else payload.entries.push(entry);
      await writePayload();
      render();
      loadEntry(entry.id);
    });
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initDaily, { once: true });
  else initDaily();
})();
