(() => {
  const homeVinyl = document.querySelector(".hero-home__sigil");
  if (!homeVinyl) return;

  const scriptUrl = document.currentScript?.src || document.baseURI;
  const trackUrl = new URL("../audio/november-rain.mp3", scriptUrl).href;
  const coverUrl = new URL("../images/music/november-rain-cover.webp", scriptUrl).href;

  homeVinyl.removeAttribute("aria-hidden");
  const trigger = document.createElement("button");
  trigger.className = "hero-home__secret-trigger";
  trigger.type = "button";
  trigger.setAttribute("aria-label", "唱片中心");
  trigger.title = "唱片中心";
  trigger.innerHTML = '<span class="sr-only">唱片中心</span>';
  homeVinyl.append(trigger);

  const player = document.createElement("section");
  player.className = "november-rain-player";
  player.hidden = true;
  player.setAttribute("role", "dialog");
  player.setAttribute("aria-modal", "true");
  player.setAttribute("aria-labelledby", "november-rain-title");
  player.innerHTML = `
    <button class="november-rain-player__backdrop" type="button" aria-label="关闭隐藏曲目"></button>
    <div class="november-rain-player__sleeve">
      <div class="november-rain-player__mark" aria-hidden="true"><i></i><span>SECRET TRACK</span></div>
      <figure class="november-rain-player__cover">
        <img src="${coverUrl}" alt="November Rain 专辑封面">
      </figure>
      <div class="november-rain-player__details">
        <p>HIDDEN · TRACK 11</p>
        <h2 id="november-rain-title">November Rain</h2>
        <span>Guns N' Roses</span>
        <audio class="november-rain-player__audio" controls preload="none"></audio>
      </div>
      <button class="november-rain-player__close" type="button" aria-label="关闭隐藏曲目"><span aria-hidden="true"></span></button>
    </div>`;
  document.body.append(player);

  const audio = player.querySelector(".november-rain-player__audio");
  const closeButton = player.querySelector(".november-rain-player__close");
  let clickTimes = [];
  let closeTimer;
  let resumeBackgroundMusic = false;

  const close = () => {
    if (player.hidden) return;
    player.classList.remove("is-visible");
    document.body.classList.remove("november-rain-open");
    audio.pause();
    window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(() => {
      player.hidden = true;
      trigger.focus({ preventScroll: true });
    }, 360);
    window.dispatchEvent(new CustomEvent("lhyzs:secret-track-close", {
      detail: { resumeBackgroundMusic },
    }));
    resumeBackgroundMusic = false;
  };

  const open = () => {
    window.clearTimeout(closeTimer);
    resumeBackgroundMusic = document.body.classList.contains("lhyzs-music-playing");
    window.dispatchEvent(new CustomEvent("lhyzs:secret-track-open"));
    player.hidden = false;
    document.body.classList.add("november-rain-open");
    window.requestAnimationFrame(() => player.classList.add("is-visible"));
    if (!audio.src) audio.src = trackUrl;
    audio.currentTime = 0;
    audio.play().catch(() => undefined);
    closeButton.focus({ preventScroll: true });
  };

  trigger.addEventListener("click", () => {
    const now = performance.now();
    clickTimes = clickTimes.filter((time) => now - time < 2400);
    clickTimes.push(now);
    homeVinyl.classList.remove("is-secret-tapped");
    void homeVinyl.offsetWidth;
    homeVinyl.classList.add("is-secret-tapped");
    if (clickTimes.length < 5) return;
    clickTimes = [];
    open();
  });

  player.querySelectorAll(".november-rain-player__backdrop, .november-rain-player__close")
    .forEach((button) => button.addEventListener("click", close));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !player.hidden) {
      event.preventDefault();
      close();
    }
  });
})();
