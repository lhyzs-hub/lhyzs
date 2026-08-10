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
  const MUSIC_ENABLED_STORAGE_KEY = "lhyzs-background-music-enabled";
  const MUSIC_TIME_STORAGE_KEY = "lhyzs-background-music-time";
  const MOON_ASSET_URL = new URL("../images/theme-moon-skill.png", scriptUrl || document.baseURI).href;
  const SEARCH_EASTER_EGG_ASSET_URL = new URL("../images/search-easter-egg-lhyzs.webp", scriptUrl || document.baseURI).href;
  const NAVIGATION_CLICK_ASSET_URL = new URL("../audio/navigation-metal-click.ogg", scriptUrl || document.baseURI).href;
  const PLAY_CLICK_ASSET_URL = new URL("../audio/play-heavy-metal.ogg", scriptUrl || document.baseURI).href;
  const BACKGROUND_MUSIC_ASSET_URL = new URL("../audio/background-rock.mp3", scriptUrl || document.baseURI).href;
  const SUN_ICON = `
    <svg class="theme-glyph theme-glyph--sun" viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="5.2"/>
      <circle cx="16" cy="16" r="2.15"/>
      <path class="theme-glyph__rays" d="M16 1.5 17.65 8.5h-3.3L16 1.5ZM16 30.5l-1.65-7h3.3l-1.65 7ZM1.5 16l7-1.65v3.3L1.5 16ZM30.5 16l-7 1.65v-3.3l7 1.65ZM4.4 4.4l6.8 4.3-2.5 2.5-4.3-6.8ZM27.6 27.6l-6.8-4.3 2.5-2.5 4.3 6.8ZM27.6 4.4l-4.3 6.8-2.5-2.5 6.8-4.3ZM4.4 27.6l4.3-6.8 2.5 2.5-6.8 4.3Z"/>
    </svg>`;
  const MOON_ICON = `
    <img class="theme-glyph theme-glyph--moon" src="${MOON_ASSET_URL}" alt="" aria-hidden="true">`;
  const MUSIC_ICON = `
    <svg class="music-switch__glyph" viewBox="0 0 32 32" aria-hidden="true">
      <g class="music-switch__record">
        <circle class="music-switch__disc" cx="11.5" cy="21" r="6.8"/>
        <circle cx="11.5" cy="21" r="4.35"/>
        <path class="music-switch__axes" d="m8.45 17.95 6.1 6.1m0-6.1-6.1 6.1"/>
        <circle class="music-switch__hub" cx="11.5" cy="21" r="1.45"/>
        <path class="music-switch__notch" d="M11.5 14.2v2"/>
      </g>
      <path class="music-switch__stem" d="M18.3 20.6V6.1"/>
      <path class="music-switch__flag" d="M18.3 6.1c4.9.1 7.9 2.2 7.55 5.75-.2 2.1-1.7 3.75-3.8 4.35 1.25-1.35 1.15-3.2-.05-4.4-.8-.8-2.1-1.2-3.7-1.2"/>
    </svg>`;

  const createSoundTemplate = (source, volume) => {
    const sound = new Audio(source);
    sound.preload = "auto";
    sound.volume = volume;
    return sound;
  };

  const navigationClickTemplate = createSoundTemplate(NAVIGATION_CLICK_ASSET_URL, 0.34);
  const playClickTemplate = createSoundTemplate(PLAY_CLICK_ASSET_URL, 0.34);
  const backgroundMusic = new Audio();
  backgroundMusic.preload = "metadata";
  backgroundMusic.volume = 0.28;
  backgroundMusic.loop = true;
  backgroundMusic.src = BACKGROUND_MUSIC_ASSET_URL;
  const activeClickSounds = new Set();
  const MAX_ACTIVE_CLICK_SOUNDS = 16;

  const playNavigationClick = (isPlayLauncher = false) => {
    const template = isPlayLauncher ? playClickTemplate : navigationClickTemplate;
    const sound = template.cloneNode();
    sound.preload = "auto";
    sound.volume = template.volume;

    if (activeClickSounds.size >= MAX_ACTIVE_CLICK_SOUNDS) {
      const oldestSound = activeClickSounds.values().next().value;
      oldestSound.pause();
      activeClickSounds.delete(oldestSound);
    }

    const releaseSound = () => activeClickSounds.delete(sound);
    sound.addEventListener("ended", releaseSound, { once: true });
    sound.addEventListener("error", releaseSound, { once: true });
    activeClickSounds.add(sound);
    sound.play().catch(() => {
      releaseSound();
      // Browsers may suppress sound before the first trusted user interaction.
    });
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

    const musicSwitch = document.createElement("button");
    musicSwitch.className = "music-switch";
    musicSwitch.type = "button";
    musicSwitch.innerHTML = MUSIC_ICON;
    backgroundMusic.className = "lhyzs-background-music";
    backgroundMusic.hidden = true;
    document.body.append(backgroundMusic);
    headerInner.append(musicSwitch);

    let musicState = "paused";
    let musicProgressRestored = false;
    let lastSavedMusicSecond = -1;

    const updateMusicSwitch = (state) => {
      musicState = state;
      const isPlaying = state === "playing";
      musicSwitch.setAttribute("aria-pressed", String(isPlaying));
      musicSwitch.classList.toggle("is-loading", state === "loading");
      musicSwitch.classList.toggle("is-awaiting", state === "awaiting");
      musicSwitch.dataset.musicState = state;

      const label = isPlaying
        ? "关闭背景音乐"
        : state === "awaiting"
          ? "继续播放背景音乐"
          : "播放背景音乐";
      musicSwitch.setAttribute("aria-label", label);
      musicSwitch.title = label;
    };

    const saveMusicProgress = (force = false) => {
      const currentTime = backgroundMusic.currentTime;
      if (!Number.isFinite(currentTime) || currentTime <= 0.25) return;
      const wholeSecond = Math.floor(currentTime);
      if (!force && wholeSecond === lastSavedMusicSecond) return;
      lastSavedMusicSecond = wholeSecond;
      sessionStorage.setItem(MUSIC_TIME_STORAGE_KEY, String(currentTime));
    };

    const loadSeekableMusicSource = async () => {
      const response = await fetch(BACKGROUND_MUSIC_ASSET_URL, { cache: "force-cache" });
      if (!response.ok) throw new Error("Background music failed to load.");
      const objectUrl = URL.createObjectURL(await response.blob());

      await new Promise((resolve, reject) => {
        const cleanup = () => {
          backgroundMusic.removeEventListener("loadedmetadata", handleReady);
          backgroundMusic.removeEventListener("error", handleError);
        };
        const handleReady = () => {
          cleanup();
          resolve();
        };
        const handleError = () => {
          cleanup();
          reject(new Error("Background music metadata failed to load."));
        };
        backgroundMusic.addEventListener("loadedmetadata", handleReady, { once: true });
        backgroundMusic.addEventListener("error", handleError, { once: true });
        backgroundMusic.preload = "auto";
        backgroundMusic.src = objectUrl;
        backgroundMusic.load();
      });
    };

    const restoreMusicProgress = async () => {
      if (musicProgressRestored) return;
      const savedTime = Number(sessionStorage.getItem(MUSIC_TIME_STORAGE_KEY));
      if (!Number.isFinite(savedTime) || savedTime <= 0.25) {
        musicProgressRestored = true;
        return;
      }

      await loadSeekableMusicSource();
      const duration = Number.isFinite(backgroundMusic.duration) ? backgroundMusic.duration : 0;
      const targetTime = duration > 0 ? savedTime % duration : savedTime;
      await new Promise((resolve) => {
        let seekTimeout;
        const finishSeek = () => {
          window.clearTimeout(seekTimeout);
          backgroundMusic.removeEventListener("seeked", finishSeek);
          resolve();
        };
        backgroundMusic.addEventListener("seeked", finishSeek, { once: true });
        seekTimeout = window.setTimeout(finishSeek, 1600);
        backgroundMusic.currentTime = targetTime;
      });
      musicProgressRestored = true;
    };

    const startBackgroundMusic = async ({ keepPreferenceOnFailure = false } = {}) => {
      localStorage.setItem(MUSIC_ENABLED_STORAGE_KEY, "true");
      updateMusicSwitch("loading");
      try {
        await restoreMusicProgress();
        await backgroundMusic.play();
        updateMusicSwitch("playing");
      } catch {
        if (!keepPreferenceOnFailure) {
          localStorage.setItem(MUSIC_ENABLED_STORAGE_KEY, "false");
        }
        updateMusicSwitch(keepPreferenceOnFailure ? "awaiting" : "paused");
      }
    };

    const stopBackgroundMusic = () => {
      saveMusicProgress(true);
      localStorage.setItem(MUSIC_ENABLED_STORAGE_KEY, "false");
      backgroundMusic.pause();
      updateMusicSwitch("paused");
    };

    updateMusicSwitch("paused");
    musicSwitch.addEventListener("click", () => {
      if (!backgroundMusic.paused || musicState === "playing") {
        stopBackgroundMusic();
      } else {
        startBackgroundMusic();
      }
    });

    backgroundMusic.addEventListener("play", () => updateMusicSwitch("playing"));
    backgroundMusic.addEventListener("pause", () => {
      if (musicState === "playing") updateMusicSwitch("paused");
    });
    backgroundMusic.addEventListener("timeupdate", () => saveMusicProgress());
    backgroundMusic.addEventListener("error", () => {
      localStorage.setItem(MUSIC_ENABLED_STORAGE_KEY, "false");
      updateMusicSwitch("paused");
    });
    window.addEventListener("pagehide", () => saveMusicProgress(true));

    if (localStorage.getItem(MUSIC_ENABLED_STORAGE_KEY) === "true") {
      startBackgroundMusic({ keepPreferenceOnFailure: true });
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

    const searchEasterEgg = document.createElement("button");
    searchEasterEgg.className = "search-easter-egg";
    searchEasterEgg.type = "button";
    searchEasterEgg.hidden = true;
    searchEasterEgg.setAttribute("aria-label", "关闭彩蛋");
    searchEasterEgg.innerHTML = `<img src="${SEARCH_EASTER_EGG_ASSET_URL}" alt="">`;
    document.body.append(searchEasterEgg);

    let easterEggTrigger;
    let easterEggCloseTimer;

    const closeSearchEasterEgg = () => {
      if (searchEasterEgg.hidden) return;
      searchEasterEgg.classList.remove("is-visible");
      document.body.classList.remove("search-easter-egg-open");
      window.clearTimeout(easterEggCloseTimer);
      easterEggCloseTimer = window.setTimeout(() => {
        searchEasterEgg.hidden = true;
        easterEggTrigger?.focus({ preventScroll: true });
      }, 220);
    };

    const openSearchEasterEgg = (searchInput) => {
      window.clearTimeout(easterEggCloseTimer);
      easterEggTrigger = searchInput;
      searchEasterEgg.hidden = false;
      document.body.classList.add("search-easter-egg-open");
      window.requestAnimationFrame(() => {
        searchEasterEgg.classList.add("is-visible");
        searchEasterEgg.focus({ preventScroll: true });
      });
    };

    searchEasterEgg.addEventListener("click", closeSearchEasterEgg);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !searchEasterEgg.hidden) {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeSearchEasterEgg();
        return;
      }

      const searchInput = event.target.closest?.(".md-search__input");
      if (
        !searchInput
        || event.key !== "Enter"
        || event.isComposing
        || searchInput.value.trim().toLowerCase() !== "lhyzs"
      ) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      playNavigationClick(false);
      openSearchEasterEgg(searchInput);
    }, true);

    const pressableSelector = [
      ".play-launcher",
      ".game-nav .md-tabs__link",
      ".md-header__button",
      ".music-switch",
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
