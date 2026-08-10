(() => {
  const registerOfflineSupport = () => {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) return;

    const scriptUrl = document.currentScript?.src;
    if (!scriptUrl) return;

    const siteRoot = new URL("../../", scriptUrl);
    const workerUrl = new URL("service-worker.js", siteRoot);
    navigator.serviceWorker.register(workerUrl, { scope: siteRoot.pathname }).catch(() => {
      // Offline support is progressive enhancement; the site remains usable if registration is blocked.
    });
  };

  registerOfflineSupport();

  const THEME_STORAGE_KEY = "lhyzs-theme";
  const SUN_ICON = `
    <svg class="theme-glyph theme-glyph--sun" viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="5.2"/>
      <circle cx="16" cy="16" r="2.15"/>
      <path d="M16 2.2v6M16 23.8v6M2.2 16h6M23.8 16h6M6.25 6.25l4.2 4.2M21.55 21.55l4.2 4.2M25.75 6.25l-4.2 4.2M10.45 21.55l-4.2 4.2"/>
    </svg>`;
  const MOON_ICON = `
    <svg class="theme-glyph theme-glyph--moon" viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="9.3" r="5.15"/>
      <path d="M5.15 6.8C6.35 19.6 11.05 27.75 16 29c4.95-1.25 9.65-9.4 10.85-22.2-2.85 5.5-6.65 8.35-10.85 8.35S8 12.3 5.15 6.8Z"/>
      <path d="M8.6 15.9C10.45 20.55 12.9 23 16 23.8c3.1-.8 5.55-3.25 7.4-7.9"/>
    </svg>`;

  const preferredTheme = () => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved === "light" || saved === "dark" ? saved : "dark";
  };

  const applyTheme = (theme, button) => {
    document.documentElement.dataset.lhyzsTheme = theme;
    document.documentElement.style.colorScheme = theme;
    if (!button) return;
    const isLight = theme === "light";
    const switchesToLight = !isLight;
    button.dataset.currentTheme = theme;
    button.dataset.nextTheme = switchesToLight ? "light" : "dark";
    button.classList.toggle("theme-switch--sun", isLight);
    button.classList.toggle("theme-switch--moon", !isLight);
    button.innerHTML = isLight ? SUN_ICON : MOON_ICON;
    button.setAttribute("aria-label", switchesToLight ? "切换到白色主题" : "切换到黑色主题");
    button.title = switchesToLight ? "白色主题" : "黑色主题";
  };

  applyTheme(preferredTheme());

  const initHeader = () => {
    document.body.classList.toggle("lhyzs-home", Boolean(document.querySelector(".hero-home")));
    document.body.classList.toggle("lhyzs-notes-hub", Boolean(document.querySelector("[data-notes-hub]")));

    const headerInner = document.querySelector(".md-header__inner");
    if (!headerInner || headerInner.dataset.lhyzsReady === "true") return;

    headerInner.dataset.lhyzsReady = "true";

    const homeLink = document.querySelector(".md-header__title a, .md-logo")?.href || new URL("./", document.baseURI).href;
    const assetUrl = new URL("assets/images/avatar.png", homeLink).href;
    const playUrl = new URL("play/", homeLink).href;

    const launcher = document.createElement("a");
    launcher.className = "play-launcher";
    launcher.href = playUrl;
    launcher.innerHTML = `
      <span class="play-launcher__steps" aria-hidden="true"><i></i><i></i><i></i></span>
      <span class="play-launcher__frame" aria-hidden="true"></span>
      <span class="play-launcher__label" data-text="PLAY">PLAY</span>`;
    launcher.setAttribute("aria-label", "打开小游戏入口");
    const normalizePath = (pathname) => pathname.replace(/index\.html$/, "").replace(/\/+$/, "/");
    const isPlayPage = normalizePath(window.location.pathname) === normalizePath(new URL(playUrl).pathname);
    launcher.classList.toggle("is-play-current", isPlayPage);
    if (isPlayPage) launcher.setAttribute("aria-current", "page");
    headerInner.prepend(launcher);

    const tabsList = document.querySelector(".md-tabs__list");
    if (tabsList) {
      const nav = document.createElement("nav");
      nav.className = "game-nav";
      nav.setAttribute("aria-label", "主导航");
      nav.append(tabsList);
      headerInner.append(nav);
    }

    const themeSwitch = document.createElement("button");
    themeSwitch.className = "theme-switch";
    themeSwitch.type = "button";
    headerInner.append(themeSwitch);
    applyTheme(document.documentElement.dataset.lhyzsTheme || preferredTheme(), themeSwitch);
    themeSwitch.addEventListener("click", () => {
      const nextTheme = themeSwitch.dataset.nextTheme || "light";
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      applyTheme(nextTheme, themeSwitch);
    });

    const profile = document.createElement("div");
    profile.className = "player-profile";
    profile.innerHTML = `
      <button class="player-profile__trigger" type="button" aria-expanded="false" aria-controls="player-profile-card" aria-label="查看 lhyzs 的个人信息">
        <img class="player-profile__avatar" src="${assetUrl}" alt="">
        <span class="player-profile__level" aria-label="等级 19">19</span>
      </button>
      <section class="player-profile__card" id="player-profile-card" aria-label="个人信息" hidden>
        <div class="player-profile__head">
          <img class="player-profile__card-avatar" src="${assetUrl}" alt="lhyzs 的头像">
          <div>
            <p class="player-profile__name">lhyzs</p>
            <span class="player-profile__rank">LV. 19</span>
          </div>
        </div>
        <p class="player-profile__school">浙江大学机械工程专业在读</p>
        <p class="player-profile__label">个人爱好</p>
        <div class="player-profile__interests" aria-label="个人爱好">
          <span class="player-profile__interest">篮球</span>
          <span class="player-profile__interest">二次元</span>
          <span class="player-profile__interest">游戏</span>
        </div>
      </section>`;

    headerInner.append(profile);

    const trigger = profile.querySelector(".player-profile__trigger");
    const card = profile.querySelector(".player-profile__card");

    const setOpen = (open) => {
      trigger.setAttribute("aria-expanded", String(open));
      card.hidden = !open;
    };

    trigger.addEventListener("click", () => {
      setOpen(trigger.getAttribute("aria-expanded") !== "true");
    });

    document.addEventListener("click", (event) => {
      if (!profile.contains(event.target)) setOpen(false);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && trigger.getAttribute("aria-expanded") === "true") {
        setOpen(false);
        trigger.focus();
      }
    });

    const pressableSelector = [
      ".play-launcher",
      ".game-nav .md-tabs__link",
      '.md-header__button.md-icon[for="__search"]',
      ".theme-switch",
      ".player-profile__trigger",
      ".hero-home__action",
      ".hero-home__update"
    ].join(",");

    const flashPressable = (pressable) => {
      if (!pressable) return;
      if (pressable.classList.contains("play-launcher")) {
        pressable.classList.remove("is-play-pressed");
        void pressable.offsetWidth;
        pressable.classList.add("is-play-pressed");
        window.setTimeout(() => {
          if (!pressable.classList.contains("is-play-current")) {
            pressable.classList.remove("is-play-pressed");
          }
        }, 520);
        return;
      }
      pressable.classList.remove("is-press-glow");
      void pressable.offsetWidth;
      pressable.classList.add("is-press-glow");
    };

    document.addEventListener("pointerdown", (event) => {
      flashPressable(event.target.closest(pressableSelector));
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      flashPressable(event.target.closest(pressableSelector));
    });

    document.addEventListener("animationend", (event) => {
      if (event.animationName === "lhyzs-press-glow") {
        event.target.classList.remove("is-press-glow");
      }
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initHeader, { once: true });
  } else {
    initHeader();
  }
})();
