(() => {
  const scriptUrl = document.currentScript?.src || location.href;
  const galleryUrl = new URL("daily-gallery.js", scriptUrl).href;
  const editorUrl = new URL("daily-editor.js", scriptUrl).href;
  let galleryModule;
  const initDaily = async () => {
    const root = document.querySelector("#daily-space");
    if (!root || root.dataset.ready === "true") return;
    root.dataset.ready = "true";

    const timeline = root.querySelector("#daily-timeline");
    const notice = root.querySelector("#daily-space-notice");
    const postCount = root.querySelector("#daily-post-count");
    const photoCount = root.querySelector("#daily-photo-count");
    const ownerButton = root.querySelector("#daily-owner-edit");
    const loadMore = root.querySelector("#daily-load-more");
    const loadMoreButton = root.querySelector("#daily-load-more-button");
    const loadMoreStatus = root.querySelector("#daily-load-more-status");

    const ownerHost = ["localhost", "127.0.0.1", "::1"].includes(location.hostname);
    const initialEntryCount = 4;
    const entryBatchSize = 4;
    let payload = { source: "QQ空间", cutoff: "2025-08-15T00:00:00+08:00", entries: [] };
    let photoManifest = {};
    let visibleEntryCount = initialEntryCount;
    const requestedCommentEntry = new URLSearchParams(location.search).get("comment");

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
        ${safeImages.slice(0, 4).map((src, index) => {
          const meta = photoManifest[src] || {};
          const preview = meta.thumbnail || src;
          const dimensions = meta.thumbnail_width && meta.thumbnail_height
            ? ` width="${meta.thumbnail_width}" height="${meta.thumbnail_height}"`
            : "";
          const remaining = index === 3 ? safeImages.length - 4 : 0;
          const label = remaining > 0 ? `查看全部 ${safeImages.length} 张照片` : `查看第 ${index + 1} 张高清照片`;
          return `<button type="button" data-photo="${escapeHtml(src)}" data-photo-index="${index}" aria-label="${label}" aria-haspopup="dialog"><img src="${escapeHtml(preview)}" alt="" loading="lazy" decoding="async" fetchpriority="low"${dimensions}>${remaining > 0 ? `<span class="daily-card__photo-more" aria-hidden="true">+${remaining}<small>查看全部</small></span>` : ""}</button>`;
        }).join("")}
      </div>`;
    };

    const updateLoadMore = () => {
      const visible = Math.min(visibleEntryCount, payload.entries.length);
      const remaining = payload.entries.length - visible;
      loadMore.hidden = remaining <= 0;
      loadMoreStatus.textContent = remaining > 0
        ? `已显示 ${visible} / ${payload.entries.length} 条`
        : "";
      loadMoreButton.setAttribute("aria-label", remaining > 0
        ? `加载更多日常，还剩 ${remaining} 条`
        : "已显示全部日常");
    };

    const render = () => {
      payload.entries = (payload.entries || []).sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
      postCount.textContent = String(payload.entries.length);
      photoCount.textContent = String(payload.entries.reduce((sum, entry) => sum + (entry.images || []).length, 0));

      if (!payload.entries.length) {
        notice.hidden = false;
        notice.innerHTML = ownerHost
          ? "还没有日常记录。点右侧的“编辑日常”，写几个字或加一张图片就能发布。"
          : "日常内容正在整理中。";
        timeline.innerHTML = "";
        loadMore.hidden = true;
        return;
      }

      notice.hidden = true;
      let currentMonth = "";
      timeline.innerHTML = payload.entries.slice(0, visibleEntryCount).map((entry) => {
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
      updateLoadMore();
      document.dispatchEvent(new CustomEvent("lhyzs:daily-rendered", { detail: { root } }));
    };

    try {
      const [response, manifestResponse] = await Promise.all([
        fetch(root.dataset.source, { cache: "no-cache" }),
        fetch(root.dataset.photoManifest || "photo-manifest.json", { cache: "no-cache" }).catch(() => null)
      ]);
      if (response.ok) payload = await response.json();
      if (manifestResponse?.ok) photoManifest = await manifestResponse.json();
    } catch (_) {}

    if (requestedCommentEntry) {
      const requestedIndex = payload.entries.findIndex((entry) => entry.id === requestedCommentEntry);
      if (requestedIndex >= 0) visibleEntryCount = Math.max(visibleEntryCount, requestedIndex + 1);
    }
    render();

    if (ownerHost) {
      ownerButton.hidden = false;
      import(editorUrl)
        .then(({ initDailyEditor }) => initDailyEditor({
          root,
          timeline,
          ownerButton,
          render,
          getPayload: () => payload,
          setPayload: (value) => { payload = value; },
          getPhotoManifest: () => photoManifest,
          setPhotoManifest: (value) => { photoManifest = value; }
        }))
        .catch(() => {
          ownerButton.hidden = true;
          notice.hidden = false;
          notice.textContent = "日常编辑器加载失败，请刷新后重试。";
        });
    }

    if (requestedCommentEntry) {
      window.requestAnimationFrame(() => {
        const card = timeline.querySelector(`[data-entry-id="${CSS.escape(requestedCommentEntry)}"]`);
        card?.scrollIntoView({ behavior: "smooth", block: "center" });
        card?.querySelector("[data-comments-toggle]")?.click();
      });
    }

    loadMoreButton.addEventListener("click", () => {
      visibleEntryCount += entryBatchSize;
      render();
    });

    timeline.addEventListener("click", async (event) => {
      const photo = event.target.closest("[data-photo]");
      if (!photo) return;
      const entryId = photo.closest("[data-entry-id]")?.dataset.entryId;
      const entry = payload.entries.find((item) => item.id === entryId);
      const photos = (entry?.images || []).filter(Boolean);
      if (!photos.length) return;
      photo.setAttribute("aria-busy", "true");
      try {
        galleryModule ||= import(galleryUrl).catch((error) => { galleryModule = null; throw error; });
        const { openGallery } = await galleryModule;
        openGallery({ root, photos, index: Number(photo.dataset.photoIndex) || 0, caption: dateLabel(entry.date), opener: photo });
      } catch (_) {
        notice.textContent = "照片预览暂时无法打开，请联网后重试。";
        notice.hidden = false;
      } finally {
        photo.removeAttribute("aria-busy");
      }
    });
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initDaily, { once: true });
  else initDaily();
})();
