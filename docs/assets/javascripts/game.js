(() => {
  const STORAGE_BEST = "lhyzs-yuumi-best";
  const STORAGE_NAME = "lhyzs-yuumi-player-name";

  const initGame = () => {
    const root = document.querySelector("#yuumi-flight-game");
    if (!root || root.dataset.ready === "true") return;
    root.dataset.ready = "true";

    const canvas = root.querySelector("#yuumi-game-canvas");
    const ctx = canvas.getContext("2d");
    const curtain = root.querySelector("#game-curtain");
    const startButton = root.querySelector("#game-start");
    const pauseButton = root.querySelector("#game-pause");
    const soundButton = root.querySelector("#game-sound");
    const statusLabel = root.querySelector("#game-status");
    const distanceLabel = root.querySelector("#game-distance");
    const bestLabel = root.querySelector("#game-best");
    const themeLabel = root.querySelector("#game-theme-label");
    const leaderboard = root.querySelector("#game-leaderboard");
    const boardStatus = root.querySelector("#game-board-status");
    const scoreForm = root.querySelector("#score-form");
    const scoreSubmitButton = scoreForm.querySelector("button[type='submit']");
    const playerNameInput = scoreForm.elements.name;
    const scoreTurnstile = scoreForm.querySelector("[data-score-turnstile]");
    const security = window.LHYZS_SECURITY;

    const config = window.LHYZS_SUPABASE || {};
    const isConfigured = Boolean(config.url && config.publishableKey && window.supabase?.createClient);
    const supabaseClient = isConfigured
      ? window.supabase.createClient(config.url, config.publishableKey, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
        })
      : null;

    const W = canvas.width;
    const H = canvas.height;
    const isDay = new Date().getHours() >= 6 && new Date().getHours() < 18;
    const sprite = new Image();
    const sceneBackground = new Image();
    const loadImage = (image, source) => new Promise((resolve, reject) => {
      image.decoding = "async";
      image.addEventListener("load", resolve, { once: true });
      image.addEventListener("error", reject, { once: true });
      image.src = new URL(source, document.baseURI).href;
      if (image.complete && image.naturalWidth) resolve();
    });
    const assetsPromise = Promise.all([
      loadImage(sprite, root.dataset.sprite),
      loadImage(sceneBackground, isDay ? root.dataset.dayBackground : root.dataset.nightBackground)
    ]);
    ctx.imageSmoothingEnabled = false;
    themeLabel.textContent = isDay ? "白昼 · 雪林" : "夜晚 · 冰洞";
    root.classList.toggle("is-night", !isDay);

    const player = { x: 185, y: 255, width: 88, height: 68, velocity: 0 };
    const frameRects = [
      [42, 32, 340, 300],
      [405, 25, 335, 300],
      [760, 45, 330, 285],
      [1115, 42, 330, 290]
    ];
    const particles = Array.from({ length: 52 }, (_, index) => ({
      x: (index * 83) % W,
      y: (index * 47) % H,
      size: 2 + (index % 3),
      speed: 12 + (index % 5) * 4
    }));

    let state = "loading";
    let assetsReady = false;
    let soundOn = true;
    let lastTime = performance.now();
    let distance = 0;
    let best = Number(localStorage.getItem(STORAGE_BEST) || 0);
    let worldOffset = 0;
    let obstacles = [];
    let lastGapY = H / 2;
    let submitted = false;
    let currentRunId = "";
    let isArming = false;
    let audioContext;
    let boardEntries = [];

    const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
    })[char]);

    const setBoardStatus = (text, tone = "ready") => {
      boardStatus.textContent = text;
      boardStatus.dataset.tone = tone;
    };

    const armSecureRun = async () => {
      currentRunId = "";
      if (!security?.configured) {
        setBoardStatus("只读模式", "warning");
        return;
      }
      try {
        const result = await security.submit("start_game");
        currentRunId = result.runId || "";
      } catch (error) {
        console.error("Unable to create secure game run", error);
        setBoardStatus("登记暂停", "warning");
      }
    };

    const mountScoreVerification = async () => {
      if (!security?.configured || !scoreTurnstile || !currentRunId) {
        scoreSubmitButton.disabled = true;
        return;
      }
      try {
        security.reset(scoreTurnstile);
        await security.mount(scoreTurnstile, "score");
        scoreSubmitButton.disabled = false;
      } catch (error) {
        console.error("Unable to load score verification", error);
        scoreSubmitButton.disabled = true;
        setBoardStatus("验证失败", "error");
      }
    };

    const renderBoard = () => {
      if (!boardEntries.length) {
        leaderboard.innerHTML = '<li class="yuumi-leaderboard__empty">暂无公共成绩，来拿下第一名吧</li>';
        return;
      }

      leaderboard.innerHTML = boardEntries.map((entry, index) => `
        <li class="rank-${index + 1}">
          <span class="yuumi-leaderboard__rank">${index + 1}</span>
          <span class="yuumi-leaderboard__name">${escapeHtml(entry.name)}</span>
          <strong>${entry.score} m</strong>
        </li>`).join("");
    };

    const loadBoard = async (quiet = false) => {
      if (!supabaseClient) {
        boardEntries = [];
        renderBoard();
        setBoardStatus("未连接", "error");
        return;
      }

      if (!quiet) setBoardStatus("同步中", "loading");
      const { data, error } = await supabaseClient
        .from("game_scores")
        .select("id,player_name,score,created_at")
        .order("score", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(5);

      if (error) {
        console.error("Unable to load game leaderboard", error);
        boardEntries = [];
        renderBoard();
        setBoardStatus("同步失败", "error");
        return;
      }

      boardEntries = (data || []).map((entry) => ({
        name: entry.player_name,
        score: entry.score
      }));
      renderBoard();
      setBoardStatus("云端", "ready");
    };

    const chooseGapY = () => {
      const margin = 184;
      const minDelta = 64;
      let next = margin + Math.random() * (H - margin * 2);
      let attempts = 0;
      while (Math.abs(next - lastGapY) < minDelta && attempts < 12) {
        next = margin + Math.random() * (H - margin * 2);
        attempts += 1;
      }
      if (Math.abs(next - lastGapY) < minDelta) {
        next = lastGapY < H / 2 ? H - margin : margin;
      }
      lastGapY = next;
      return next;
    };

    const resetObstacles = () => {
      lastGapY = H / 2;
      obstacles = [0, 1, 2, 3].map((_, index) => ({
        x: 610 + index * 260,
        gapY: chooseGapY(),
        passed: false
      }));
    };

    const beep = (frequency, duration = 0.05) => {
      if (!soundOn) return;
      try {
        audioContext ||= new AudioContext();
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.frequency.value = frequency;
        oscillator.type = "square";
        gain.gain.setValueAtTime(0.025, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
        oscillator.connect(gain).connect(audioContext.destination);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration);
      } catch (_) {}
    };

    const reset = () => {
      state = "ready";
      distance = 0;
      worldOffset = 0;
      player.y = H / 2 - 20;
      player.velocity = 0;
      submitted = false;
      currentRunId = "";
      isArming = false;
      resetObstacles();
      distanceLabel.textContent = "0 m";
      bestLabel.textContent = `${best} m`;
      statusLabel.textContent = "冰柱高低错落，找准节奏穿过去";
      startButton.textContent = "开始飞行";
      curtain.hidden = false;
      scoreForm.hidden = true;
      pauseButton.textContent = "暂停";
    };

    const start = async () => {
      if (!assetsReady || state === "playing" || isArming) return;
      if (state === "gameover") reset();
      isArming = true;
      state = "arming";
      statusLabel.textContent = "正在建立安全赛局…";
      startButton.textContent = "准备中…";
      await armSecureRun();
      isArming = false;
      state = "playing";
      curtain.hidden = true;
      player.velocity = -270;
      canvas.focus({ preventScroll: true });
      beep(520);
    };

    const flap = () => {
      if (state === "ready" || state === "gameover") {
        start();
        return;
      }
      if (state !== "playing") return;
      player.velocity = -300;
      beep(620);
    };

    const gameOver = () => {
      if (state !== "playing") return;
      state = "gameover";
      const score = Math.floor(distance);
      best = Math.max(best, score);
      localStorage.setItem(STORAGE_BEST, String(best));
      bestLabel.textContent = `${best} m`;
      statusLabel.textContent = `本次飞行 ${score} 米`;
      startButton.textContent = "再飞一次";
      curtain.hidden = false;
      scoreForm.hidden = false;
      mountScoreVerification();
      beep(130, 0.18);
    };

    const togglePause = () => {
      if (state === "playing") {
        state = "paused";
        statusLabel.textContent = "已暂停";
        startButton.textContent = "继续飞行";
        curtain.hidden = false;
        pauseButton.textContent = "继续";
      } else if (state === "paused") {
        state = "playing";
        curtain.hidden = true;
        pauseButton.textContent = "暂停";
      }
    };

    const drawBackground = (dt) => {
      worldOffset += (state === "playing" ? 34 : 8) * dt;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sceneBackground, 0, 0, W, H);

      const hazeShift = -Math.round((worldOffset * 0.22) % 190);
      ctx.fillStyle = isDay ? "rgba(214, 245, 244, 0.1)" : "rgba(72, 142, 166, 0.09)";
      for (let x = hazeShift - 190; x < W + 190; x += 190) {
        ctx.fillRect(x, Math.round(H * 0.72), 112, 5);
        ctx.fillRect(x + 46, Math.round(H * 0.76), 128, 3);
      }

      for (const particle of particles) {
        particle.x -= particle.speed * dt;
        particle.y += particle.speed * 0.18 * dt;
        if (particle.x < 0) particle.x = W;
        if (particle.y > H) particle.y = 0;
        ctx.fillStyle = isDay ? "rgba(255,255,255,.9)" : "rgba(147,221,232,.75)";
        ctx.fillRect(Math.round(particle.x / 3) * 3, Math.round(particle.y / 3) * 3, particle.size + 1, particle.size + 1);
      }
    };

    const drawIceWall = (x, y, width, height, capAtBottom) => {
      const px = Math.round(x);
      const py = Math.round(y);
      const ph = Math.max(0, Math.round(height));
      if (ph <= 0) return;
      ctx.fillStyle = "#123f63";
      ctx.fillRect(px, py, width, ph);
      ctx.fillStyle = "#1e6285";
      ctx.fillRect(px + 8, py, width - 16, ph);
      ctx.fillStyle = "#318aac";
      ctx.fillRect(px + 13, py, 8, ph);
      ctx.fillStyle = "#0d3456";
      ctx.fillRect(px + width - 18, py, 10, ph);

      for (let row = py + 22; row < py + ph - 18; row += 42) {
        const offset = ((row / 42) & 1) ? 0 : 12;
        ctx.fillStyle = "#68c6d8";
        ctx.fillRect(px + 24 + offset, row, 28, 4);
        ctx.fillRect(px + 48 + offset, row + 4, 4, 17);
        ctx.fillStyle = "#174f75";
        ctx.fillRect(px + 52 + offset, row + 17, 20, 4);
      }

      const capY = capAtBottom ? py + ph - 18 : py;
      ctx.fillStyle = "#dff4f1";
      ctx.fillRect(px - 4, capY, width + 8, 12);
      ctx.fillStyle = "#a7dce1";
      ctx.fillRect(px, capAtBottom ? capY + 12 : capY + 12, width, 6);
      ctx.fillStyle = "#effaf7";
      ctx.fillRect(px + 8, capY + 3, 26, 4);
      ctx.fillRect(px + 50, capY + 2, 30, 4);
    };

    const drawPillar = (obstacle) => {
      const gap = 208;
      const width = 96;
      const topHeight = obstacle.gapY - gap / 2;
      const bottomY = obstacle.gapY + gap / 2;
      drawIceWall(obstacle.x, 0, width, topHeight, true);
      drawIceWall(obstacle.x, bottomY, width, H - bottomY, false);
    };

    const drawPlayer = (time) => {
      const frame = frameRects[Math.floor(time / 140) % frameRects.length];
      const bob = state === "ready" ? Math.sin(time / 270) * 5 : 0;
      ctx.save();
      ctx.translate(player.x + player.width / 2, player.y + player.height / 2 + bob);
      ctx.rotate(Math.max(-0.24, Math.min(0.42, player.velocity / 1050)));
      ctx.drawImage(sprite, ...frame, -player.width / 2 - 10, -player.height / 2 - 10, player.width + 20, player.height + 20);
      ctx.restore();
    };

    const update = (dt) => {
      if (state !== "playing") return;
      const speed = 205;
      player.velocity += 720 * dt;
      player.y += player.velocity * dt;
      distance += speed * dt / 10;
      distanceLabel.textContent = `${Math.floor(distance)} m`;

      for (const obstacle of obstacles) {
        obstacle.x -= speed * dt;
        if (!obstacle.passed && obstacle.x + 96 < player.x) {
          obstacle.passed = true;
          beep(820, 0.035);
        }
        if (obstacle.x < -130) {
          const farthest = Math.max(...obstacles.map((item) => item.x));
          obstacle.x = farthest + 260;
          obstacle.gapY = chooseGapY();
          obstacle.passed = false;
        }
      }

      const px = player.x + 25;
      const py = player.y + 17;
      const pw = player.width - 50;
      const ph = player.height - 34;
      if (py < 0 || py + ph > H) gameOver();
      for (const obstacle of obstacles) {
        const overlapX = px + pw > obstacle.x + 12 && px < obstacle.x + 84;
        const gapTop = obstacle.gapY - 116;
        const gapBottom = obstacle.gapY + 116;
        if (overlapX && (py < gapTop || py + ph > gapBottom)) gameOver();
      }
    };

    const loop = (time) => {
      const dt = Math.min((time - lastTime) / 1000, 0.035);
      lastTime = time;
      update(dt);
      drawBackground(dt);
      obstacles.forEach(drawPillar);
      drawPlayer(time);
      requestAnimationFrame(loop);
    };

    startButton.addEventListener("click", (event) => {
      event.stopPropagation();
      if (state === "paused") togglePause();
      else start();
    });
    pauseButton.addEventListener("click", togglePause);
    soundButton.addEventListener("click", () => {
      soundOn = !soundOn;
      soundButton.textContent = `音效 ${soundOn ? "开" : "关"}`;
    });
    canvas.addEventListener("pointerdown", flap);
    window.addEventListener("keydown", (event) => {
      if (!root.isConnected || event.repeat) return;
      if (event.code === "Space" && !["INPUT", "BUTTON"].includes(document.activeElement?.tagName)) {
        event.preventDefault();
        flap();
      } else if (event.key.toLowerCase() === "p") {
        togglePause();
      } else if (event.key.toLowerCase() === "r" && assetsReady && !isArming) {
        reset();
        start();
      }
    });
    scoreForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (submitted) return;
      if (!supabaseClient || !security?.configured || !currentRunId) {
        setBoardStatus("未连接", "error");
        return;
      }

      const name = playerNameInput.value.trim().slice(0, 12);
      const score = Math.floor(distance);
      if (!name || score < 1) return;
      const turnstileToken = security.token(scoreTurnstile);
      if (!turnstileToken) {
        setBoardStatus("请完成人机验证", "warning");
        return;
      }

      scoreSubmitButton.disabled = true;
      scoreSubmitButton.textContent = "提交中…";
      setBoardStatus("提交中", "loading");
      try {
        await security.submit("score", {
          playerName: name,
          score,
          runId: currentRunId,
          turnstileToken
        });
      } catch (error) {
        console.error("Unable to submit game score", error);
        setBoardStatus(error.message || "提交失败", error.code === "rate_limited" ? "warning" : "error");
        if (error.code === "score_rejected") scoreForm.hidden = true;
        security.reset(scoreTurnstile);
        scoreSubmitButton.disabled = false;
        scoreSubmitButton.textContent = "登记";
        return;
      }

      localStorage.setItem(STORAGE_NAME, name);
      submitted = true;
      scoreForm.hidden = true;
      security.reset(scoreTurnstile);
      scoreSubmitButton.disabled = false;
      scoreSubmitButton.textContent = "登记";
      await loadBoard();
    });

    playerNameInput.value = localStorage.getItem(STORAGE_NAME) || "";
    renderBoard();
    loadBoard();
    window.setInterval(() => {
      if (!document.hidden && root.isConnected) loadBoard(true);
    }, 30000);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && root.isConnected) loadBoard(true);
    });
    assetsPromise.then(() => {
      if (!root.isConnected) return;
      assetsReady = true;
      startButton.disabled = false;
      reset();
      lastTime = performance.now();
      drawBackground(0);
      obstacles.forEach(drawPillar);
      drawPlayer(lastTime);
      root.dataset.assets = "ready";
      requestAnimationFrame(loop);
    }).catch((error) => {
      console.error("Unable to load game artwork", error);
      state = "error";
      root.dataset.assets = "error";
      statusLabel.textContent = "冬境素材加载失败，请刷新重试";
      startButton.textContent = "无法开始";
      startButton.disabled = true;
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGame, { once: true });
  } else {
    initGame();
  }
})();
