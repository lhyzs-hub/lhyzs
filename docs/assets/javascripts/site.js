(() => {
  const initHeader = () => {
    document.body.classList.toggle("lhyzs-home", Boolean(document.querySelector(".hero-home")));

    const headerInner = document.querySelector(".md-header__inner");
    if (!headerInner || headerInner.dataset.lhyzsReady === "true") return;

    headerInner.dataset.lhyzsReady = "true";

    const homeLink = document.querySelector(".md-header__title a, .md-logo")?.href || new URL("./", document.baseURI).href;
    const assetUrl = new URL("assets/images/avatar.png", homeLink).href;
    const playUrl = new URL("play/", homeLink).href;

    const launcher = document.createElement("a");
    launcher.className = "play-launcher";
    launcher.href = playUrl;
    launcher.textContent = "PLAY";
    launcher.setAttribute("aria-label", "打开小游戏入口");
    headerInner.prepend(launcher);

    const tabsList = document.querySelector(".md-tabs__list");
    if (tabsList) {
      const nav = document.createElement("nav");
      nav.className = "game-nav";
      nav.setAttribute("aria-label", "主导航");
      nav.append(tabsList);
      headerInner.append(nav);
    }

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
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initHeader, { once: true });
  } else {
    initHeader();
  }
})();
