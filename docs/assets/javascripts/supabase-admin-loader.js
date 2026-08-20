(() => {
  const scriptUrl = document.currentScript?.src;
  if (!scriptUrl) return;

  const assetUrl = (name) => new URL(name, scriptUrl).href;
  const loadScript = (source) => new Promise((resolve, reject) => {
    const existing = [...document.scripts].find((script) => script.src === source);
    if (existing) {
      if (existing.dataset.loaded === "true" || existing.readyState === "complete") resolve();
      else {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
      }
      return;
    }

    const dependency = document.createElement("script");
    dependency.src = source;
    dependency.addEventListener("load", () => {
      dependency.dataset.loaded = "true";
      resolve();
    }, { once: true });
    dependency.addEventListener("error", reject, { once: true });
    document.head.append(dependency);
  });

  let loading;
  const loadAdmin = () => {
    if (window.LHYZS_ADMIN) return Promise.resolve(window.LHYZS_ADMIN);
    if (loading) return loading;
    loading = Promise.resolve()
      .then(() => window.LHYZS_SUPABASE || loadScript(assetUrl("supabase-config.js")))
      .then(() => window.supabase || loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.2/dist/umd/supabase.min.js"))
      .then(() => window.LHYZS_ADMIN || loadScript(assetUrl("admin-auth.js")))
      .then(() => window.LHYZS_ADMIN)
      .catch((error) => {
        loading = undefined;
        throw error;
      });
    return loading;
  };

  const bindProfile = (profile) => {
    const trigger = profile?.querySelector(".player-profile__trigger");
    if (!trigger || trigger.dataset.adminLoaderReady === "true") return;
    trigger.dataset.adminLoaderReady = "true";
    trigger.addEventListener("click", () => { loadAdmin().catch(() => {}); }, { once: true });
  };

  document.addEventListener("lhyzs:profile-ready", (event) => bindProfile(event.detail?.profile));
  bindProfile(document.querySelector(".player-profile"));
  window.LHYZS_LOAD_ADMIN = loadAdmin;
})();
