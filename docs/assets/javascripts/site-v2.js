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

  const initGoldenCursor = () => {
    const finePointer = window.matchMedia("(pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!finePointer.matches || reducedMotion.matches || document.documentElement.dataset.lhyzsCursorReady === "true") return;

    document.documentElement.dataset.lhyzsCursorReady = "true";
    document.documentElement.classList.add("lhyzs-golden-cursor");

    const canvas = document.createElement("canvas");
    canvas.className = "lhyzs-cursor-trail";
    canvas.setAttribute("aria-hidden", "true");
    document.body.append(canvas);

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) {
      canvas.remove();
      return;
    }

    const trail = [];
    const maxTrailPoints = 38;
    const trailLifetime = 380;
    const cursorTailOffset = { x: 15.8, y: 16.3 };
    let frameId = 0;
    let lastPoint;
    let pixelRatio = 1;

    const resize = () => {
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * pixelRatio);
      canvas.height = Math.round(window.innerHeight * pixelRatio);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };

    const requestFrame = () => {
      if (!frameId) frameId = window.requestAnimationFrame(render);
    };

    const addTrailPoint = (x, y, time) => {
      trail.push({ x, y, time });
      if (trail.length > maxTrailPoints) trail.splice(0, trail.length - maxTrailPoints);
    };

    const drawRibbon = (now) => {
      if (trail.length < 2) return;
      const isLight = document.documentElement.dataset.lhyzsTheme === "light";
      const color = isLight ? "145, 94, 20" : "220, 172, 64";
      const highlight = isLight ? "181, 126, 37" : "245, 216, 142";
      const glow = isLight ? "159, 105, 24" : "232, 190, 92";
      const newest = trail[trail.length - 1];
      const idleFade = Math.max(0, 1 - (now - newest.time) / trailLifetime);
      const lastIndex = trail.length - 1;
      const points = trail.map((point, index) => ({
        x: point.x,
        y: point.y,
        progress: lastIndex ? index / lastIndex : 1
      }));

      const leftEdge = [];
      const rightEdge = [];
      points.forEach((point, index) => {
        const previous = points[Math.max(0, index - 1)];
        const next = points[Math.min(lastIndex, index + 1)];
        const tangentX = next.x - previous.x;
        const tangentY = next.y - previous.y;
        const tangentLength = Math.hypot(tangentX, tangentY) || 1;
        const normalX = -tangentY / tangentLength;
        const normalY = tangentX / tangentLength;
        const halfWidth = 0.18 + 1.5 * Math.pow(point.progress, 1.35);
        leftEdge.push({ x: point.x + normalX * halfWidth, y: point.y + normalY * halfWidth });
        rightEdge.push({ x: point.x - normalX * halfWidth, y: point.y - normalY * halfWidth });
      });

      const oldest = points[0];
      const gradient = context.createLinearGradient(oldest.x, oldest.y, newest.x, newest.y);
      gradient.addColorStop(0, `rgba(${color}, 0)`);
      gradient.addColorStop(0.32, `rgba(${color}, ${0.16 * idleFade})`);
      gradient.addColorStop(0.76, `rgba(${color}, ${0.5 * idleFade})`);
      gradient.addColorStop(1, `rgba(${highlight}, ${0.8 * idleFade})`);

      context.beginPath();
      context.moveTo(leftEdge[0].x, leftEdge[0].y);
      for (let index = 1; index < leftEdge.length; index += 1) context.lineTo(leftEdge[index].x, leftEdge[index].y);
      for (let index = rightEdge.length - 1; index >= 0; index -= 1) context.lineTo(rightEdge[index].x, rightEdge[index].y);
      context.closePath();
      context.fillStyle = gradient;
      context.shadowColor = `rgba(${glow}, ${0.42 * idleFade})`;
      context.shadowBlur = 9;
      context.fill();

      context.shadowBlur = 3;
      context.lineCap = "round";
      context.lineJoin = "round";
      for (let index = 1; index < points.length; index += 1) {
        const start = points[index - 1];
        const end = points[index];
        const flow = 0.52 + 0.48 * Math.sin(now * 0.015 - index * 0.62);
        const opacity = (0.12 + flow * 0.24) * end.progress * idleFade;
        context.beginPath();
        context.moveTo(start.x, start.y);
        context.lineTo(end.x, end.y);
        context.strokeStyle = `rgba(${highlight}, ${opacity})`;
        context.lineWidth = 0.42 + end.progress * 0.42;
        context.stroke();
      }
    };

    const render = (now) => {
      frameId = 0;
      while (trail.length && now - trail[0].time >= trailLifetime) trail.shift();
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      drawRibbon(now);
      context.shadowBlur = 0;
      if (trail.length) requestFrame();
    };

    const handlePointerMove = (event) => {
      if (event.pointerType && event.pointerType !== "mouse") return;
      const point = {
        x: event.clientX + cursorTailOffset.x,
        y: event.clientY + cursorTailOffset.y
      };
      const time = performance.now();
      if (!lastPoint) {
        lastPoint = point;
        addTrailPoint(point.x, point.y, time);
        requestFrame();
        return;
      }

      const deltaX = point.x - lastPoint.x;
      const deltaY = point.y - lastPoint.y;
      const distance = Math.hypot(deltaX, deltaY);
      if (distance < 2) return;

      const steps = Math.min(8, Math.max(1, Math.floor(distance / 5)));
      for (let step = 1; step <= steps; step += 1) {
        const ratio = step / steps;
        addTrailPoint(lastPoint.x + deltaX * ratio, lastPoint.y + deltaY * ratio, time);
      }
      lastPoint = point;
      requestFrame();
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("pointerleave", () => { lastPoint = undefined; });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        trail.length = 0;
        lastPoint = undefined;
      }
    });
  };

  initGoldenCursor();

  const initHeader = () => {
    document.body.classList.toggle("lhyzs-home", Boolean(document.querySelector(".hero-home")));
    document.body.classList.toggle("lhyzs-notes-hub", Boolean(document.querySelector("[data-notes-hub]")));

    const headerInner = document.querySelector(".md-header__inner");
    if (!headerInner || headerInner.dataset.lhyzsReady === "true") return;

    headerInner.dataset.lhyzsReady = "true";

    const homeLink = document.querySelector(".md-header__title a, .md-logo")?.href || new URL("./", document.baseURI).href;
    const assetUrl = new URL("assets/images/avatar.png", homeLink).href;
    const playUrl = new URL("play/", homeLink).href;
    const adminCommentsUrl = new URL("admin/comments/", homeLink).href;

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
      tabsList.style.setProperty("--lhyzs-nav-item-count", String(tabsList.children.length));
      const nav = document.createElement("nav");
      nav.className = "game-nav";
      nav.setAttribute("aria-label", "主导航");
      nav.append(tabsList);
      headerInner.append(nav);

      const activeTab = tabsList.querySelector(".md-tabs__item--active");
      const updateNavOverflow = () => {
        const overflow = nav.scrollWidth - nav.clientWidth > 2;
        nav.classList.toggle("is-overflowing", overflow);
        nav.classList.toggle("can-scroll-left", overflow && nav.scrollLeft > 2);
        nav.classList.toggle(
          "can-scroll-right",
          overflow && nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 2,
        );
      };
      const revealActiveTab = () => {
        if (!activeTab || nav.scrollWidth <= nav.clientWidth) {
          updateNavOverflow();
          return;
        }
        const target = activeTab.offsetLeft - (nav.clientWidth - activeTab.offsetWidth) / 2;
        nav.scrollTo({ left: Math.max(0, target), behavior: "auto" });
        updateNavOverflow();
      };

      nav.addEventListener("scroll", updateNavOverflow, { passive: true });
      window.addEventListener("resize", revealActiveTab, { passive: true });
      window.requestAnimationFrame(revealActiveTab);
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
      document.body.classList.toggle("lhyzs-music-playing", isPlaying);

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
        <span class="player-profile__notification" data-comment-admin-trigger-count hidden>0</span>
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
        <a class="player-profile__admin-link" href="${adminCommentsUrl}" data-comment-admin-link hidden>
          <span class="player-profile__admin-identity">
            <svg class="player-profile__admin-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 8.5a7 7 0 0 1 14 0v4.2l1.4 2.25H3.6L5 12.7V8.5Z"/>
              <path d="M9.5 18a2.7 2.7 0 0 0 5 0"/>
            </svg>
            <span><strong>评论通知</strong><small>OWNER CONSOLE</small></span>
          </span>
          <b data-comment-admin-count hidden>0</b>
        </a>
        <a class="player-profile__github" href="https://github.com/lhyzs-hub" target="_blank" rel="me noopener noreferrer" aria-label="访问 lhyzs-hub 的 GitHub 主页（新窗口打开）">
          <span class="player-profile__github-identity">
            <svg class="player-profile__github-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M12 2C6.48 2 2 6.58 2 12.23c0 4.52 2.87 8.35 6.84 9.71.5.09.68-.22.68-.49 0-.24-.01-1.04-.01-1.89-2.78.62-3.37-1.21-3.37-1.21-.45-1.19-1.11-1.5-1.11-1.5-.91-.64.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.89 1.57 2.34 1.11 2.91.85.09-.67.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.3 9.3 0 0 1 12 6.69a9.2 9.2 0 0 1 2.5.35c1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.79-4.57 5.04.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.59.69.49A10.25 10.25 0 0 0 22 12.23C22 6.58 17.52 2 12 2Z"/>
            </svg>
            <span><strong>GitHub</strong><small>@lhyzs-hub</small></span>
          </span>
          <span class="player-profile__github-arrow" aria-hidden="true">↗</span>
        </a>
      </section>`;

    headerInner.append(profile);
    document.dispatchEvent(new CustomEvent("lhyzs:profile-ready", { detail: { profile } }));

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
      ".player-profile__admin-link",
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
