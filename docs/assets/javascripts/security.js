(() => {
  const config = window.LHYZS_SUPABASE || {};
  const widgets = new WeakMap();
  const configured = Boolean(config.url && config.publishableKey && config.turnstileSiteKey);
  let turnstileLoadPromise;

  const waitForTurnstile = (timeout = 12000) => {
    if (window.turnstile?.render) return Promise.resolve(window.turnstile);
    if (turnstileLoadPromise) return turnstileLoadPromise;
    turnstileLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      const startedAt = Date.now();
      const timer = window.setInterval(() => {
        if (window.turnstile?.render) {
          window.clearInterval(timer);
          resolve(window.turnstile);
        } else if (Date.now() - startedAt >= timeout) {
          window.clearInterval(timer);
          reject(new Error("Turnstile failed to load"));
        }
      }, 100);
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.addEventListener("error", () => {
        window.clearInterval(timer);
        reject(new Error("Turnstile failed to load"));
      }, { once: true });
      document.head.append(script);
    });
    return turnstileLoadPromise;
  };

  const mount = async (container, action) => {
    if (!configured || !container || widgets.has(container)) return false;
    const turnstile = await waitForTurnstile();
    const state = { id: null, token: "" };
    widgets.set(container, state);
    state.id = turnstile.render(container, {
      sitekey: config.turnstileSiteKey,
      action,
      theme: "auto",
      size: "flexible",
      appearance: "interaction-only",
      callback: (token) => {
        state.token = token;
        container.dataset.verified = "true";
      },
      "expired-callback": () => {
        state.token = "";
        container.dataset.verified = "false";
      },
      "error-callback": () => {
        state.token = "";
        container.dataset.verified = "false";
      },
    });
    return true;
  };

  const token = (container) => widgets.get(container)?.token || "";

  const reset = (container) => {
    const state = widgets.get(container);
    if (!state || !window.turnstile) return;
    state.token = "";
    container.dataset.verified = "false";
    window.turnstile.reset(state.id);
  };

  const submit = async (action, payload = {}) => {
    if (!configured) throw new Error("安全服务尚未完成配置");
    const response = await fetch(`${config.url}/functions/v1/public-submit`, {
      method: "POST",
      headers: {
        apikey: config.publishableKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action, ...payload }),
    });
    const result = await response.json().catch(() => ({ ok: false, message: "安全服务返回异常" }));
    if (!response.ok || !result.ok) {
      const error = new Error(result.message || "提交失败，请稍后重试");
      error.code = result.code || "request_failed";
      error.retryAfter = result.retryAfter || 0;
      throw error;
    }
    return result;
  };

  window.LHYZS_SECURITY = Object.freeze({ configured, mount, token, reset, submit });
})();
