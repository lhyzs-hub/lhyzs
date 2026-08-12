(() => {
  const CONFIG = window.LHYZS_SUPABASE || {};
  const ADMIN_EMAIL = "3178287074@qq.com";
  const LAST_SEEN_KEY = "lhyzs-comment-admin-last-seen";
  const scriptUrl = document.currentScript?.src;
  const siteRoot = new URL("../../", scriptUrl || document.baseURI);
  const adminUrl = new URL("admin/comments/", siteRoot).href;
  const configured = Boolean(CONFIG.url && CONFIG.publishableKey && window.supabase?.createClient);
  const client = configured
    ? window.supabase.createClient(CONFIG.url, CONFIG.publishableKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      })
    : null;

  const isAdmin = (session) => session?.user?.email?.toLowerCase() === ADMIN_EMAIL;
  let currentSession = null;

  const profileEntry = () => document.querySelector("[data-comment-admin-link]");

  const syncUnreadCount = async () => {
    const entry = profileEntry();
    if (!entry) return;
    entry.hidden = !isAdmin(currentSession);
    if (!isAdmin(currentSession)) {
      const triggerBadge = document.querySelector("[data-comment-admin-trigger-count]");
      if (triggerBadge) triggerBadge.hidden = true;
      return;
    }

    const lastSeen = localStorage.getItem(LAST_SEEN_KEY) || "1970-01-01T00:00:00.000Z";
    const { count, error } = await client
      .from("site_comments")
      .select("id", { count: "exact", head: true })
      .gt("created_at", lastSeen);
    if (error) {
      console.error("Unable to sync admin comment count", error);
      return;
    }
    const badge = entry.querySelector("[data-comment-admin-count]");
    const triggerBadge = document.querySelector("[data-comment-admin-trigger-count]");
    const value = count || 0;
    badge.textContent = value > 99 ? "99+" : String(value);
    badge.hidden = value < 1;
    if (triggerBadge) {
      triggerBadge.textContent = value > 99 ? "99+" : String(value);
      triggerBadge.hidden = value < 1;
    }
    entry.setAttribute("aria-label", value ? `打开评论通知，${value} 条未读` : "打开评论通知");
  };

  const emitSession = () => {
    document.dispatchEvent(new CustomEvent("lhyzs:admin-session", {
      detail: { session: currentSession, isAdmin: isAdmin(currentSession) }
    }));
  };

  const ready = (async () => {
    if (!client) return null;
    const { data, error } = await client.auth.getSession();
    if (error) console.error("Unable to restore admin session", error);
    currentSession = data?.session || null;
    syncUnreadCount();
    emitSession();
    return currentSession;
  })();

  if (client) {
    client.auth.onAuthStateChange((_event, session) => {
      currentSession = session;
      queueMicrotask(() => {
        syncUnreadCount();
        emitSession();
      });
    });
  }

  document.addEventListener("lhyzs:profile-ready", syncUnreadCount);

  const markAllRead = (timestamp = new Date().toISOString()) => {
    localStorage.setItem(LAST_SEEN_KEY, timestamp);
    syncUnreadCount();
  };

  window.LHYZS_ADMIN = Object.freeze({
    ADMIN_EMAIL,
    LAST_SEEN_KEY,
    adminUrl,
    client,
    configured,
    isAdmin,
    markAllRead,
    ready,
    session: () => currentSession,
    syncUnreadCount
  });
})();
