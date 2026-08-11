(() => {
  const CONFIG = window.LHYZS_SUPABASE || {};
  const security = window.LHYZS_SECURITY;
  const isConfigured = Boolean(CONFIG.url && CONFIG.publishableKey && window.supabase?.createClient);
  const client = isConfigured
    ? window.supabase.createClient(CONFIG.url, CONFIG.publishableKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
      })
    : null;

  const pageKeyFromLocation = () => {
    const parts = location.pathname.replace(/index\.html$/, "").split("/").filter(Boolean);
    const notesIndex = parts.indexOf("notes");
    if (notesIndex < 0 || parts.length - notesIndex < 3) return null;
    return `note/${parts.slice(notesIndex + 1).map((part) => decodeURIComponent(part)).join("/")}`;
  };

  const relativeTime = (value) => {
    const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
    const absolute = Math.abs(seconds);
    const formatter = new Intl.RelativeTimeFormat("zh-CN", { numeric: "auto" });
    if (absolute < 60) return formatter.format(seconds, "second");
    if (absolute < 3600) return formatter.format(Math.round(seconds / 60), "minute");
    if (absolute < 86400) return formatter.format(Math.round(seconds / 3600), "hour");
    if (absolute < 2592000) return formatter.format(Math.round(seconds / 86400), "day");
    return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "short", day: "numeric" }).format(new Date(value));
  };

  const makeAvatar = (author) => {
    const avatar = document.createElement("span");
    avatar.className = "site-comment__avatar";
    avatar.textContent = Array.from(author.trim())[0]?.toUpperCase() || "?";
    avatar.setAttribute("aria-hidden", "true");
    return avatar;
  };

  let dailyCountSyncId = 0;

  const updateDailyToggleCount = (toggle, value, state = "ready") => {
    const count = toggle.querySelector("[data-comments-count]");
    if (!count) return;
    count.textContent = String(value);
    toggle.dataset.commentsCountState = state;
    if (state === "ready") {
      toggle.setAttribute("aria-label", `查看 ${value} 条评论`);
      toggle.title = `${value} 条评论`;
    } else if (state === "error") {
      toggle.setAttribute("aria-label", "评论数暂时无法同步，点击后重试");
      toggle.title = "评论数暂时无法同步，点击后重试";
    } else {
      toggle.setAttribute("aria-label", "正在同步评论数");
      toggle.removeAttribute("title");
    }
  };

  const syncDailyCommentCounts = async (scope = document) => {
    const toggles = [...scope.querySelectorAll("[data-comments-toggle][data-page-key]")];
    if (!toggles.length) return;
    const syncId = ++dailyCountSyncId;
    toggles.forEach((toggle) => updateDailyToggleCount(toggle, "…", "loading"));

    if (!client) {
      toggles.forEach((toggle) => updateDailyToggleCount(toggle, "—", "error"));
      return;
    }

    const pageKeys = [...new Set(toggles.map((toggle) => toggle.dataset.pageKey).filter(Boolean))];
    const counts = new Map(pageKeys.map((pageKey) => [pageKey, 0]));

    try {
      for (let index = 0; index < pageKeys.length; index += 50) {
        const batch = pageKeys.slice(index, index + 50);
        const { data, error } = await client
          .from("site_comments")
          .select("page_key")
          .in("page_key", batch)
          .limit(1000);
        if (error) throw error;
        (data || []).forEach(({ page_key: pageKey }) => {
          if (counts.has(pageKey)) counts.set(pageKey, counts.get(pageKey) + 1);
        });
      }

      if (syncId !== dailyCountSyncId) return;
      toggles.forEach((toggle) => {
        if (toggle.isConnected) updateDailyToggleCount(toggle, counts.get(toggle.dataset.pageKey) || 0);
      });
    } catch (error) {
      console.error("Unable to sync daily comment counts", error);
      if (syncId !== dailyCountSyncId) return;
      toggles.forEach((toggle) => {
        if (toggle.isConnected) updateDailyToggleCount(toggle, "—", "error");
      });
    }
  };

  const renderComments = (panel, comments) => {
    const list = panel.querySelector("[data-comments-list]");
    const count = panel.querySelector("[data-panel-count]");
    const toggleCount = panel.closest(".daily-card")?.querySelector("[data-comments-count]");
    count.textContent = String(comments.length);
    if (toggleCount) updateDailyToggleCount(toggleCount.closest("[data-comments-toggle]"), comments.length);
    list.replaceChildren();

    if (!comments.length) {
      const empty = document.createElement("p");
      empty.className = "comments-panel__empty";
      empty.textContent = "还没有评论，来留下第一句话吧。";
      list.append(empty);
      return;
    }

    comments.forEach((comment) => {
      const item = document.createElement("article");
      item.className = "site-comment";
      const body = document.createElement("div");
      const head = document.createElement("header");
      const author = document.createElement("strong");
      const time = document.createElement("time");
      const content = document.createElement("p");
      author.textContent = comment.author;
      time.dateTime = comment.created_at;
      time.textContent = relativeTime(comment.created_at);
      content.textContent = comment.content;
      head.append(author, time);
      body.append(head, content);
      item.append(makeAvatar(comment.author), body);
      list.append(item);
    });
  };

  const setStatus = (panel, text, tone = "ready") => {
    const status = panel.querySelector("[data-comments-status]");
    status.textContent = text;
    status.dataset.tone = tone;
  };

  const loadComments = async (panel) => {
    const pageKey = panel.dataset.pageKey;
    if (!client) {
      setStatus(panel, "评论服务待连接", "warning");
      renderComments(panel, []);
      return;
    }

    setStatus(panel, "正在同步…", "loading");
    const { data, error } = await client
      .from("site_comments")
      .select("id,author,content,created_at")
      .eq("page_key", pageKey)
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) {
      console.error("Unable to load comments", error);
      setStatus(panel, "同步失败，请稍后重试", "error");
      renderComments(panel, []);
      return;
    }

    renderComments(panel, data || []);
    setStatus(panel, security?.configured ? "安全同步已开启" : "只读模式", security?.configured ? "ready" : "warning");
  };

  const mountVerification = async (form) => {
    const host = form.querySelector("[data-turnstile]");
    const submitButton = form.querySelector("button[type='submit']");
    const formMessage = form.querySelector("[data-form-message]");
    if (!security?.configured) {
      submitButton.disabled = true;
      formMessage.textContent = "安全服务待启用";
      return;
    }
    try {
      await security.mount(host, "comment");
    } catch (error) {
      console.error("Unable to load Turnstile", error);
      submitButton.disabled = true;
      formMessage.textContent = "人机验证加载失败，请刷新重试";
    }
  };

  const createPanel = (pageKey, compact = false) => {
    const panel = document.createElement("section");
    panel.className = `comments-panel${compact ? " comments-panel--compact" : ""}`;
    panel.dataset.pageKey = pageKey;
    panel.innerHTML = `
      <header class="comments-panel__head">
        <div><h2>讨论区</h2><span><b data-panel-count>0</b> 条评论</span></div>
        <p data-comments-status data-tone="loading">正在同步…</p>
      </header>
      <form class="comments-form">
        <div class="comments-form__meta">
          <label>昵称<input name="author" maxlength="32" autocomplete="nickname" placeholder="怎么称呼你" required></label>
          <span>匿名发布 · 已启用防刷保护</span>
        </div>
        <label class="comments-form__content">
          <span class="sr-only">评论内容</span>
          <textarea name="content" maxlength="500" rows="${compact ? 3 : 5}" placeholder="留下你的想法…" required></textarea>
          <small><b data-character-count>0</b> / 500</small>
        </label>
        <label class="comments-form__trap" aria-hidden="true">网址<input name="website" tabindex="-1" autocomplete="off"></label>
        <div class="human-check" data-turnstile aria-label="人机验证"></div>
        <div class="comments-form__actions"><span data-form-message aria-live="polite"></span><button type="submit">发表评论</button></div>
      </form>
      <div class="comments-panel__list" data-comments-list><p class="comments-panel__empty">正在读取评论…</p></div>`;

    const form = panel.querySelector("form");
    const authorInput = form.elements.author;
    const contentInput = form.elements.content;
    const submitButton = form.querySelector("button[type='submit']");
    const formMessage = form.querySelector("[data-form-message]");
    const turnstileHost = form.querySelector("[data-turnstile]");
    authorInput.value = localStorage.getItem("lhyzs-comment-author") || "";

    if (!client) {
      submitButton.disabled = true;
      formMessage.textContent = "评论服务待连接";
    }

    contentInput.addEventListener("input", () => {
      form.querySelector("[data-character-count]").textContent = String(contentInput.value.length);
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!client || !security?.configured || form.elements.website.value) return;
      const author = authorInput.value.trim();
      const content = contentInput.value.trim();
      if (!author || !content) return;
      const turnstileToken = security.token(turnstileHost);
      if (!turnstileToken) {
        formMessage.textContent = "请先完成人机验证";
        return;
      }

      submitButton.disabled = true;
      submitButton.textContent = "发送中…";
      formMessage.textContent = "";
      try {
        await security.submit("comment", { pageKey, author, content, turnstileToken });
        localStorage.setItem("lhyzs-comment-author", author);
        contentInput.value = "";
        form.querySelector("[data-character-count]").textContent = "0";
        formMessage.textContent = "已发布";
        await loadComments(panel);
      } catch (error) {
        console.error("Unable to create comment", error);
        formMessage.textContent = error.message || "发送失败，请稍后再试";
      } finally {
        security.reset(turnstileHost);
        submitButton.disabled = false;
        submitButton.textContent = "发表评论";
      }
    });

    requestAnimationFrame(() => mountVerification(form));
    loadComments(panel);
    return panel;
  };

  const initNoteComments = () => {
    const pageKey = pageKeyFromLocation();
    const article = document.querySelector(".md-content__inner.md-typeset");
    if (!pageKey || !article || article.querySelector(".comments-panel")) return;
    article.append(createPanel(pageKey));
  };

  const initDailyComments = () => {
    document.addEventListener("lhyzs:daily-rendered", (event) => {
      syncDailyCommentCounts(event.detail?.root || document);
    });

    document.addEventListener("click", (event) => {
      const toggle = event.target.closest("[data-comments-toggle]");
      if (!toggle) return;
      const card = toggle.closest(".daily-card");
      const host = card?.querySelector("[data-comments-host]");
      if (!host) return;

      document.querySelectorAll("[data-comments-host]:not([hidden])").forEach((openHost) => {
        if (openHost === host) return;
        openHost.hidden = true;
        openHost.closest(".daily-card")?.querySelector("[data-comments-toggle]")?.setAttribute("aria-expanded", "false");
      });

      const willOpen = host.hidden;
      host.hidden = !willOpen;
      toggle.setAttribute("aria-expanded", String(willOpen));
      if (willOpen && !host.firstElementChild) host.append(createPanel(toggle.dataset.pageKey, true));
    });

    syncDailyCommentCounts();
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) syncDailyCommentCounts();
    });
  };

  const init = () => {
    initNoteComments();
    initDailyComments();
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
