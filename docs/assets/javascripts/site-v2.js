(() => {
  const scriptUrl = document.currentScript?.src;

  const registerOfflineSupport = () => {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) return;

    if (!scriptUrl) return;

    const siteRoot = new URL("../../", scriptUrl);
    const workerUrl = new URL("service-worker.js", siteRoot);
    navigator.serviceWorker.register(workerUrl, { scope: siteRoot.pathname }).catch(() => {
      // Offline support is progressive enhancement; the site remains usable if registration is blocked.
    });
  };

  registerOfflineSupport();

  const THEME_STORAGE_KEY = "lhyzs-theme";
  const MOON_ASSET_URL = new URL("../images/theme-moon-skill.png", scriptUrl || document.baseURI).href;
  const SUN_ICON = `
    <svg class="theme-glyph theme-glyph--sun" viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="5.2"/>
      <circle cx="16" cy="16" r="2.15"/>
      <path class="theme-glyph__rays" d="M16 1.5 17.65 8.5h-3.3L16 1.5ZM16 30.5l-1.65-7h3.3l-1.65 7ZM1.5 16l7-1.65v3.3L1.5 16ZM30.5 16l-7 1.65v-3.3l7 1.65ZM4.4 4.4l6.8 4.3-2.5 2.5-4.3-6.8ZM27.6 27.6l-6.8-4.3 2.5-2.5 4.3 6.8ZM27.6 4.4l-4.3 6.8-2.5-2.5 6.8-4.3ZM4.4 27.6l4.3-6.8 2.5 2.5-6.8 4.3Z"/>
    </svg>`;
  const MOON_ICON = `
    <img class="theme-glyph theme-glyph--moon" src="${MOON_ASSET_URL}" alt="" aria-hidden="true">`;

  let navigationAudioContext;
  let navigationNoiseBuffer;

  const getNavigationAudioContext = () => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    navigationAudioContext ||= new AudioContextClass();
    if (navigationAudioContext.state === "suspended") {
      navigationAudioContext.resume().catch(() => {});
    }
    return navigationAudioContext;
  };

  const getNavigationNoise = (context) => {
    if (navigationNoiseBuffer) return navigationNoiseBuffer;
    const length = Math.ceil(context.sampleRate * 0.2);
    navigationNoiseBuffer = context.createBuffer(1, length, context.sampleRate);
    const samples = navigationNoiseBuffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) {
      const fade = 1 - index / length;
      samples[index] = (Math.random() * 2 - 1) * fade;
    }
    return navigationNoiseBuffer;
  };

  const addClickTone = (context, output, options) => {
    const start = context.currentTime + (options.delay || 0);
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = options.type;
    oscillator.frequency.setValueAtTime(options.from, start);
    oscillator.frequency.exponentialRampToValueAtTime(options.to, start + options.duration);
    envelope.gain.setValueAtTime(options.gain, start);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + options.duration);
    oscillator.connect(envelope).connect(output);
    oscillator.start(start);
    oscillator.stop(start + options.duration + 0.01);
  };

  const addClickNoise = (context, output, options) => {
    const start = context.currentTime + (options.delay || 0);
    const noise = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    noise.buffer = getNavigationNoise(context);
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(options.frequency, start);
    filter.Q.setValueAtTime(options.q, start);
    envelope.gain.setValueAtTime(options.gain, start);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + options.duration);
    noise.connect(filter).connect(envelope).connect(output);
    noise.start(start);
    noise.stop(start + options.duration);
  };

  const playNavigationClick = (isPlayLauncher = false) => {
    const context = getNavigationAudioContext();
    if (!context) return;

    const master = context.createGain();
    const limiter = context.createDynamicsCompressor();
    master.gain.setValueAtTime(isPlayLauncher ? 0.58 : 0.38, context.currentTime);
    limiter.threshold.setValueAtTime(-14, context.currentTime);
    limiter.knee.setValueAtTime(12, context.currentTime);
    limiter.ratio.setValueAtTime(8, context.currentTime);
    limiter.attack.setValueAtTime(0.002, context.currentTime);
    limiter.release.setValueAtTime(0.12, context.currentTime);
    master.connect(limiter).connect(context.destination);

    if (isPlayLauncher) {
      addClickTone(context, master, { type: "sine", from: 132, to: 48, gain: 0.28, duration: 0.18 });
      addClickTone(context, master, { type: "triangle", from: 340, to: 112, gain: 0.13, duration: 0.14 });
      addClickTone(context, master, { type: "square", from: 880, to: 420, gain: 0.035, duration: 0.07, delay: 0.012 });
      addClickTone(context, master, { type: "sine", from: 640, to: 510, gain: 0.038, duration: 0.2, delay: 0.025 });
      addClickNoise(context, master, { frequency: 520, q: 1.4, gain: 0.11, duration: 0.09 });
      window.setTimeout(() => {
        master.disconnect();
        limiter.disconnect();
      }, 280);
      return;
    }

    addClickTone(context, master, { type: "triangle", from: 1040, to: 650, gain: 0.1, duration: 0.058 });
    addClickTone(context, master, { type: "sine", from: 2180, to: 1480, gain: 0.04, duration: 0.045, delay: 0.004 });
    addClickNoise(context, master, { frequency: 3600, q: 5.5, gain: 0.06, duration: 0.035 });
    window.setTimeout(() => {
      master.disconnect();
      limiter.disconnect();
    }, 120);
  };

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
    launcher.addEventListener("click", (event) => {
      if (
        event.defaultPrevented
        || event.button !== 0
        || event.metaKey
        || event.ctrlKey
        || event.shiftKey
        || event.altKey
      ) return;
      event.preventDefault();
      window.setTimeout(() => window.location.assign(launcher.href), 150);
    });
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
      ".md-header__button",
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

    const activatePressable = (pressable) => {
      if (!pressable || pressable.matches(":disabled, [aria-disabled='true']")) return;
      flashPressable(pressable);
      playNavigationClick(pressable.classList.contains("play-launcher"));
    };

    document.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      activatePressable(event.target.closest(pressableSelector));
    });

    document.addEventListener("keydown", (event) => {
      if (event.repeat || (event.key !== "Enter" && event.key !== " ")) return;
      activatePressable(event.target.closest(pressableSelector));
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
