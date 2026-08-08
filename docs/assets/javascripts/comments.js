(() => {
  const CONFIG = window.LHYZS_SUPABASE || {};
  const isConfigured = Boolean(CONFIG.url && CONFIG.publishableKey && window.supabase?.createClient);
  const client = isConfigured
    ? window.supabase.createClient(CONFIG.url, CONFIG.publishableKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
      })
    : null;

  const escapeSelector = (value) => window.CSS?.escape ? CSS.escape(value) : value.replace(/["\\]/g, "\\$&");

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

  const renderComments = (panel, comments) => {
    const list = panel.querySelector("[data-comments-list]");
    const count = panel.querySelector("[data-panel-count]");
    const toggleCount = panel.closest(".daily-card")?.querySelector("[data-comments-count]");
    count.textContent = String(comments.length);
    if (toggleCount) toggleCount.textContent = String(comments.length);
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
    setStatus(panel, "云端同步已开启", "ready");
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
          <span>无需登录，即时发布</span>
        </div>
        <label class="comments-form__content">
          <span class="sr-only">评论内容</span>
          <textarea name="content" maxlength="500" rows="${compact ? 3 : 5}" placeholder="留下你的想法…" required></textarea>
          <small><b data-character-count>0</b> / 500</small>
        </label>
        <label class="comments-form__trap" aria-hidden="true">网址<input name="website" tabindex="-1" autocomplete="off"></label>
        <div class="comments-form__actions"><span data-form-message></span><button type="submit">发表评论</button></div>
      </form>
      <div class="comments-panel__list" data-comments-list><p class="comments-panel__empty">正在读取评论…</p></div>`;

    const form = panel.querySelector("form");
    const authorInput = form.elements.author;
    const contentInput = form.elements.content;
    const submitButton = form.querySelector("button[type='submit']");
    const formMessage = form.querySelector("[data-form-message]");
    authorInput.value = localStorage.getItem("lhyzs-comment-author") || "";
    if (!client) {
      submitButton.disabled = true;
      formMessage.textContent = "站长正在连接 Supabase";
    }

    contentInput.addEventListener("input", () => {
      form.querySelector("[data-character-count]").textContent = String(contentInput.value.length);
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!client || form.elements.website.value) return;
      const author = authorInput.value.trim();
      const content = contentInput.value.trim();
      if (!author || !content) return;

      const lastSubmit = Number(sessionStorage.getItem("lhyzs-comment-last-submit") || 0);
      if (Date.now() - lastSubmit < 12000) {
        formMessage.textContent = "请稍等几秒再发表评论";
        return;
      }

      submitButton.disabled = true;
      submitButton.textContent = "发送中…";
      formMessage.textContent = "";
      const { error } = await client.from("site_comments").insert({ page_key: pageKey, author, content });
      submitButton.disabled = false;
      submitButton.textContent = "发表评论";
      if (error) {
        console.error("Unable to create comment", error);
        formMessage.textContent = "发送失败，请稍后再试";
        return;
      }

      localStorage.setItem("lhyzs-comment-author", author);
      sessionStorage.setItem("lhyzs-comment-last-submit", String(Date.now()));
      contentInput.value = "";
      form.querySelector("[data-character-count]").textContent = "0";
      formMessage.textContent = "已发布";
      await loadComments(panel);
    });

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
  };

  const init = () => {
    initNoteComments();
    initDailyComments();
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
