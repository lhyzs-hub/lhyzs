(() => {
  const init = async () => {
    const root = document.querySelector("#comment-admin");
    if (!root || root.dataset.ready === "true") return;
    root.dataset.ready = "true";

    const admin = window.LHYZS_ADMIN;
    const login = root.querySelector("#comment-admin-login");
    const consolePanel = root.querySelector("#comment-admin-console");
    const identity = root.querySelector("#comment-admin-identity");
    const sendCode = root.querySelector("#comment-admin-send-code");
    const codeForm = root.querySelector("#comment-admin-code-form");
    const codeInput = root.querySelector("#comment-admin-code");
    const verifyCode = root.querySelector("#comment-admin-verify-code");
    const loginStatus = root.querySelector("#comment-admin-login-status");
    const signOut = root.querySelector("#comment-admin-sign-out");
    const status = root.querySelector("#comment-admin-status");
    const list = root.querySelector("#comment-admin-list");
    const search = root.querySelector("#comment-admin-search");
    const readAll = root.querySelector("#comment-admin-read-all");
    const filterButtons = [...root.querySelectorAll("[data-comment-filter]")];
    const counters = {
      total: root.querySelector("#comment-admin-total"),
      unread: root.querySelector("#comment-admin-unread"),
      visible: root.querySelector("#comment-admin-visible"),
      hidden: root.querySelector("#comment-admin-hidden")
    };
    const scriptUrl = document.currentScript?.src;
    const siteRoot = new URL("../../", scriptUrl || document.baseURI);
    let comments = [];
    let activeFilter = "all";
    const dailyEntryLabels = new Map();

    const lastSeen = () => localStorage.getItem(admin?.LAST_SEEN_KEY) || "1970-01-01T00:00:00.000Z";
    const isUnread = (comment) => new Date(comment.created_at) > new Date(lastSeen());

    const relativeTime = (value) => {
      const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
      const absolute = Math.abs(seconds);
      const formatter = new Intl.RelativeTimeFormat("zh-CN", { numeric: "auto" });
      if (absolute < 60) return formatter.format(seconds, "second");
      if (absolute < 3600) return formatter.format(Math.round(seconds / 60), "minute");
      if (absolute < 86400) return formatter.format(Math.round(seconds / 3600), "hour");
      if (absolute < 2592000) return formatter.format(Math.round(seconds / 86400), "day");
      return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
    };

    const pageInfo = (pageKey) => {
      if (pageKey.startsWith("daily/")) {
        const entryId = pageKey.slice(6);
        return {
          label: `日常 / ${dailyEntryLabels.get(entryId) || entryId}`,
          href: new URL(`daily/?comment=${encodeURIComponent(entryId)}`, siteRoot).href
        };
      }
      if (pageKey.startsWith("note/")) {
        const segments = pageKey.slice(5).split("/").filter(Boolean);
        return {
          label: `笔记 / ${segments.map(decodeURIComponent).join(" / ")}`,
          href: new URL(`notes/${segments.map(encodeURIComponent).join("/")}/`, siteRoot).href
        };
      }
      return { label: pageKey, href: siteRoot.href };
    };

    const makeAvatar = (author) => {
      const avatar = document.createElement("span");
      avatar.className = "comment-admin-item__avatar";
      avatar.textContent = Array.from(author.trim())[0]?.toUpperCase() || "?";
      avatar.setAttribute("aria-hidden", "true");
      return avatar;
    };

    const updateCounters = () => {
      counters.total.textContent = String(comments.length);
      counters.unread.textContent = String(comments.filter(isUnread).length);
      counters.visible.textContent = String(comments.filter((comment) => comment.is_visible).length);
      counters.hidden.textContent = String(comments.filter((comment) => !comment.is_visible).length);
    };

    const filteredComments = () => {
      const query = search.value.trim().toLocaleLowerCase("zh-CN");
      return comments.filter((comment) => {
        if (activeFilter === "unread" && !isUnread(comment)) return false;
        if (activeFilter === "visible" && !comment.is_visible) return false;
        if (activeFilter === "hidden" && comment.is_visible) return false;
        if (!query) return true;
        const page = pageInfo(comment.page_key).label;
        return `${comment.author}\n${comment.content}\n${page}`.toLocaleLowerCase("zh-CN").includes(query);
      });
    };

    const render = () => {
      updateCounters();
      list.replaceChildren();
      const filtered = filteredComments();
      if (!filtered.length) {
        const empty = document.createElement("p");
        empty.className = "comment-admin__empty";
        empty.textContent = comments.length ? "没有符合当前条件的评论。" : "暂时还没有评论。";
        list.append(empty);
        return;
      }

      filtered.forEach((comment) => {
        const page = pageInfo(comment.page_key);
        const item = document.createElement("article");
        item.className = "comment-admin-item";
        item.dataset.commentId = String(comment.id);
        item.classList.toggle("is-unread", isUnread(comment));
        item.classList.toggle("is-hidden", !comment.is_visible);

        const main = document.createElement("div");
        main.className = "comment-admin-item__main";
        const head = document.createElement("header");
        const author = document.createElement("strong");
        author.textContent = comment.author;
        const time = document.createElement("time");
        time.dateTime = comment.created_at;
        time.textContent = relativeTime(comment.created_at);
        const state = document.createElement("span");
        state.className = "comment-admin-item__state";
        state.textContent = comment.is_visible ? "公开" : "已隐藏";
        head.append(author, time, state);
        const content = document.createElement("p");
        content.className = "comment-admin-item__content";
        content.textContent = comment.content;
        const source = document.createElement("a");
        source.className = "comment-admin-item__source";
        source.href = page.href;
        source.textContent = page.label;
        source.append(document.createTextNode(" ↗"));
        main.append(head, content, source);

        const actions = document.createElement("div");
        actions.className = "comment-admin-item__actions";
        const visibility = document.createElement("button");
        visibility.type = "button";
        visibility.dataset.moderateAction = comment.is_visible ? "hide" : "show";
        visibility.textContent = comment.is_visible ? "隐藏" : "恢复";
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "is-danger";
        remove.dataset.moderateAction = "delete";
        remove.textContent = "删除";
        actions.append(visibility, remove);

        item.append(makeAvatar(comment.author), main, actions);
        list.append(item);
      });
    };

    const loadComments = async () => {
      status.textContent = "正在同步评论…";
      status.dataset.tone = "loading";
      try {
        const response = await fetch(new URL("daily/qzone.json", siteRoot));
        if (response.ok) {
          const daily = await response.json();
          (daily.entries || []).forEach((entry) => {
            const label = entry.content?.trim() || new Intl.DateTimeFormat("zh-CN", {
              year: "numeric", month: "short", day: "numeric"
            }).format(new Date(entry.date));
            dailyEntryLabels.set(entry.id, label);
          });
        }
      } catch (_) {}
      const { data, error } = await admin.client
        .from("site_comments")
        .select("id,page_key,author,content,is_visible,created_at,moderation_reason,moderated_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) {
        console.error("Unable to load admin comments", error);
        status.textContent = "同步失败，请确认数据库管理员策略已部署。";
        status.dataset.tone = "error";
        return;
      }
      comments = data || [];
      status.textContent = `已同步 ${comments.length} 条评论`;
      status.dataset.tone = "ready";
      render();
    };

    const showSession = async (session) => {
      const allowed = admin?.isAdmin(session);
      login.hidden = allowed;
      consolePanel.hidden = !allowed;
      identity.hidden = !allowed;
      if (allowed) {
        loginStatus.textContent = "验证成功，正在载入评论。";
        loginStatus.dataset.tone = "ready";
        await loadComments();
      } else if (session) {
        loginStatus.textContent = "当前账号没有管理员权限。";
        loginStatus.dataset.tone = "error";
      }
    };

    if (!admin?.configured) {
      sendCode.disabled = true;
      loginStatus.textContent = "评论服务配置尚未加载。";
      loginStatus.dataset.tone = "error";
      return;
    }

    codeInput.addEventListener("input", () => {
      codeInput.value = codeInput.value.replace(/\D/g, "").slice(0, 8);
      codeInput.setCustomValidity("");
    });
    codeInput.addEventListener("paste", (event) => {
      const pastedCode = event.clipboardData?.getData("text").replace(/\D/g, "").slice(0, 8);
      if (!pastedCode) return;
      event.preventDefault();
      codeInput.value = pastedCode;
      codeInput.setCustomValidity("");
    });

    sendCode.addEventListener("click", async () => {
      sendCode.disabled = true;
      loginStatus.textContent = "正在发送验证码…";
      loginStatus.dataset.tone = "loading";
      const { error } = await admin.client.auth.signInWithOtp({
        email: admin.ADMIN_EMAIL,
        options: {
          shouldCreateUser: true
        }
      });
      if (error) {
        loginStatus.textContent = error.status === 429
          ? "发送次数过多，请一分钟后重试。"
          : (error.message || "发送失败，请稍后重试。");
        loginStatus.dataset.tone = "error";
        sendCode.disabled = false;
        return;
      }
      codeForm.hidden = false;
      codeInput.disabled = false;
      verifyCode.disabled = false;
      loginStatus.textContent = "验证码已发送，请检查 QQ 邮箱；验证码只能使用一次。";
      loginStatus.dataset.tone = "ready";
      codeInput.focus();
      let seconds = 60;
      sendCode.textContent = `${seconds} 秒后可重发`;
      const cooldown = window.setInterval(() => {
        seconds -= 1;
        sendCode.textContent = seconds > 0 ? `${seconds} 秒后可重发` : "重新发送验证码";
        if (seconds <= 0) {
          window.clearInterval(cooldown);
          sendCode.disabled = false;
        }
      }, 1000);
    });

    codeForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const token = codeInput.value.replace(/\D/g, "");
      if (token.length !== 8) {
        codeInput.setCustomValidity("请输入邮件中的 8 位数字验证码。");
        codeInput.reportValidity();
        return;
      }

      verifyCode.disabled = true;
      codeInput.disabled = true;
      loginStatus.textContent = "正在验证…";
      loginStatus.dataset.tone = "loading";
      const { data, error } = await admin.client.auth.verifyOtp({
        email: admin.ADMIN_EMAIL,
        token,
        type: "email"
      });
      if (error) {
        loginStatus.textContent = "验证码无效、已过期或已被使用，请重新发送。";
        loginStatus.dataset.tone = "error";
        codeInput.disabled = false;
        verifyCode.disabled = false;
        codeInput.select();
        return;
      }
      if (!admin.isAdmin(data?.session)) {
        await admin.client.auth.signOut();
        loginStatus.textContent = "当前账号没有管理员权限。";
        loginStatus.dataset.tone = "error";
        codeInput.disabled = false;
        verifyCode.disabled = false;
        return;
      }
      await showSession(data.session);
    });

    signOut.addEventListener("click", async () => {
      await admin.client.auth.signOut();
      comments = [];
      list.replaceChildren();
      codeInput.value = "";
      codeInput.disabled = false;
      verifyCode.disabled = false;
      codeForm.hidden = true;
      showSession(null);
    });

    filterButtons.forEach((button) => button.addEventListener("click", () => {
      activeFilter = button.dataset.commentFilter;
      filterButtons.forEach((candidate) => candidate.setAttribute("aria-pressed", String(candidate === button)));
      render();
    }));
    search.addEventListener("input", render);
    readAll.addEventListener("click", () => {
      const newest = comments[0]?.created_at || new Date().toISOString();
      admin.markAllRead(newest);
      render();
      status.textContent = "已将当前评论全部标为已读";
    });

    list.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-moderate-action]");
      if (!button) return;
      const item = button.closest("[data-comment-id]");
      const id = Number(item?.dataset.commentId);
      const action = button.dataset.moderateAction;
      if (!Number.isInteger(id)) return;
      if (action === "delete" && !confirm("永久删除这条评论？删除后无法恢复。")) return;

      item.querySelectorAll("button").forEach((control) => { control.disabled = true; });
      status.textContent = action === "delete" ? "正在删除评论…" : "正在更新评论状态…";
      status.dataset.tone = "loading";
      const { error } = await admin.client.rpc("admin_moderate_site_comment", {
        p_comment_id: id,
        p_action: action,
        p_reason: action === "hide" ? "owner_hidden" : null
      });
      if (error) {
        console.error("Unable to moderate comment", error);
        status.textContent = "操作失败，请稍后重试。";
        status.dataset.tone = "error";
        item.querySelectorAll("button").forEach((control) => { control.disabled = false; });
        return;
      }
      const comment = comments.find((candidate) => candidate.id === id);
      if (action === "delete") comments = comments.filter((candidate) => candidate.id !== id);
      else if (comment) comment.is_visible = action === "show";
      status.textContent = action === "delete" ? "评论已永久删除" : action === "hide" ? "评论已隐藏" : "评论已恢复公开";
      status.dataset.tone = "ready";
      render();
    });

    document.addEventListener("lhyzs:admin-session", (event) => showSession(event.detail?.session || null));
    await admin.ready;
    await showSession(admin.session());
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
