(() => {
  const root = document.querySelector("[data-jungle-runner]");
  if (!root) return;

  const canvas = root.querySelector("[data-runner-canvas]");
  const ctx = canvas && canvas.getContext("2d");
  if (!ctx) return;

  const curtain = root.querySelector("[data-runner-curtain]");
  const startButton = root.querySelector("[data-runner-start]");
  const scoreNode = root.querySelector("[data-runner-score]");
  const bestNode = root.querySelector("[data-runner-best]");
  const titleNode = root.querySelector("[data-runner-title]");
  const overlineNode = root.querySelector("[data-runner-overline]");
  const copyNode = root.querySelector("[data-runner-copy]");
  const buttonTextNode = root.querySelector("[data-runner-button-text]");
  const statusNode = root.querySelector("[data-runner-status]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;
  const GROUND = 217;
  const STORAGE_KEY = "lhyzs.ivernRunner.best";
  const colors = {
    skyTop: "#07111b",
    skyBottom: "#10262a",
    far: "#122f2c",
    mid: "#174137",
    leafDark: "#183a2d",
    leaf: "#2f6b43",
    leafLight: "#6ea65b",
    moss: "#4e7a3c",
    barkDark: "#3b2922",
    bark: "#78503a",
    barkLight: "#b98a55",
    face: "#d8c69a",
    eye: "#4fc4bc",
    stoneDark: "#182831",
    stone: "#324854",
    stoneLight: "#60717a",
    stoneEdge: "#91a1a3",
    gold: "#d0a84a",
    cyan: "#35aab3",
  };

  let state = "idle";
  let lastTime = performance.now();
  let elapsed = 0;
  let distance = 0;
  let speed = 205;
  let spawnTimer = 1.25;
  let flashTimer = 0;
  let best = readBest();
  let obstacles = [];
  let particles = [];
  let player = createPlayer();

  ctx.imageSmoothingEnabled = false;
  bestNode.textContent = formatScore(best);

  function readBest() {
    try {
      const value = Number.parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
      return Number.isFinite(value) ? Math.max(0, value) : 0;
    } catch (_error) {
      return 0;
    }
  }

  function saveBest(value) {
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch (_error) {
      // The game still works when storage is unavailable.
    }
  }

  function createPlayer() {
    return {
      x: 104,
      y: GROUND - 86,
      width: 34,
      height: 86,
      velocityY: 0,
      grounded: true,
      phase: 0,
    };
  }

  function formatScore(value) {
    return String(Math.max(0, Math.floor(value))).padStart(4, "0");
  }

  function setMessage(mode) {
    if (mode === "idle") {
      overlineNode.textContent = "迷路也要优雅";
      titleNode.textContent = "准备穿越野区";
      copyNode.textContent = "跳过高低不平的石墙，看看翠神能跑多远。";
      buttonTextNode.textContent = "开始奔跑";
      statusNode.textContent = "等待开始";
    } else {
      overlineNode.textContent = `本次里程 ${Math.floor(distance)} m`;
      titleNode.textContent = "撞到野区墙了";
      copyNode.textContent = distance >= best && distance > 0
        ? "新的最佳里程！再跑一次，把纪录留得更远。"
        : "森林不会责怪迷路的人，再试一次吧。";
      buttonTextNode.textContent = "重新奔跑";
      statusNode.textContent = `游戏结束，本次里程 ${Math.floor(distance)} 米`;
    }
  }

  function resetGame() {
    state = "running";
    elapsed = 0;
    distance = 0;
    speed = 205;
    spawnTimer = 1.12;
    flashTimer = 0;
    obstacles = [];
    particles = [];
    player = createPlayer();
    scoreNode.textContent = "0000";
    curtain.classList.add("is-hidden");
    root.classList.add("is-running");
    statusNode.textContent = "奔跑中，按空格或点击跳跃";
    canvas.focus({ preventScroll: true });
  }

  function endGame() {
    if (state !== "running") return;
    state = "gameover";
    root.classList.remove("is-running");
    flashTimer = 0.18;
    const finalDistance = Math.floor(distance);
    if (finalDistance > best) {
      best = finalDistance;
      saveBest(best);
      bestNode.textContent = formatScore(best);
    }
    setMessage("gameover");
    window.setTimeout(() => {
      curtain.classList.remove("is-hidden");
      startButton.focus({ preventScroll: true });
    }, reducedMotion.matches ? 0 : 280);
  }

  function jump() {
    if (state !== "running") {
      resetGame();
      return;
    }
    if (!player.grounded) return;
    player.velocityY = -515;
    player.grounded = false;
    for (let i = 0; i < 5; i += 1) {
      particles.push({
        x: player.x + 17 + i * 2,
        y: GROUND - 3,
        vx: -35 - i * 8,
        vy: -20 - (i % 2) * 18,
        life: 0.38 + i * 0.03,
      });
    }
  }

  function spawnObstacle() {
    const tall = Math.random() > 0.55;
    const height = tall ? 68 + Math.floor(Math.random() * 24) : 43 + Math.floor(Math.random() * 18);
    const width = tall ? 33 + Math.floor(Math.random() * 15) : 45 + Math.floor(Math.random() * 20);
    obstacles.push({
      x: WIDTH + 8,
      y: GROUND - height,
      width,
      height,
      seed: Math.floor(Math.random() * 97),
    });
    const minGap = 1.08;
    const maxGap = 1.63;
    spawnTimer = minGap + Math.random() * (maxGap - minGap) + (tall ? 0.12 : 0);
  }

  function update(dt) {
    if (flashTimer > 0) flashTimer -= dt;
    if (state !== "running") {
      if (!reducedMotion.matches) player.phase += dt * 1.4;
      return;
    }

    elapsed += dt;
    distance += dt * (speed / 17);
    speed = Math.min(345, 205 + distance * 0.2);
    player.phase += dt * (speed / 15);
    player.velocityY += 1380 * dt;
    player.y += player.velocityY * dt;

    if (player.y >= GROUND - player.height) {
      player.y = GROUND - player.height;
      player.velocityY = 0;
      player.grounded = true;
    }

    spawnTimer -= dt;
    if (spawnTimer <= 0) spawnObstacle();

    obstacles.forEach((wall) => {
      wall.x -= speed * dt;
    });
    obstacles = obstacles.filter((wall) => wall.x + wall.width > -12);

    particles.forEach((particle) => {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 125 * dt;
      particle.life -= dt;
    });
    particles = particles.filter((particle) => particle.life > 0);

    const hitbox = {
      x: player.x + 9,
      y: player.y + 10,
      width: player.width - 17,
      height: player.height - 13,
    };
    for (const wall of obstacles) {
      const margin = 3;
      if (
        hitbox.x < wall.x + wall.width - margin &&
        hitbox.x + hitbox.width > wall.x + margin &&
        hitbox.y < wall.y + wall.height &&
        hitbox.y + hitbox.height > wall.y + 5
      ) {
        endGame();
        break;
      }
    }

    scoreNode.textContent = formatScore(distance);
  }

  function fillPixel(x, y, width, height, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
  }

  function pixelSegment(x1, y1, x2, y2, size, color) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const steps = Math.max(Math.abs(dx), Math.abs(dy));
    const count = Math.max(1, Math.ceil(steps / Math.max(1, size - 1)));
    for (let i = 0; i <= count; i += 1) {
      const ratio = i / count;
      fillPixel(x1 + dx * ratio - size / 2, y1 + dy * ratio - size / 2, size, size, color);
    }
  }

  function drawBackground() {
    fillPixel(0, 0, WIDTH, 52, colors.skyTop);
    fillPixel(0, 52, WIDTH, 55, "#0a1a22");
    fillPixel(0, 107, WIDTH, 62, colors.skyBottom);

    const starOffset = reducedMotion.matches ? 0 : Math.floor(elapsed * 8) % 80;
    for (let i = 0; i < 9; i += 1) {
      const x = (57 + i * 83 - starOffset + WIDTH) % WIDTH;
      const y = 31 + ((i * 29) % 72);
      fillPixel(x, y, i % 3 === 0 ? 3 : 2, 2, i % 2 ? "#6bbeb2" : "#b4ca7b");
    }

    const farOffset = Math.floor(elapsed * speed * 0.035) % 96;
    for (let x = -96 - farOffset; x < WIDTH + 96; x += 96) {
      fillPixel(x + 10, 112, 22, 64, "#0d2a29");
      fillPixel(x + 3, 98, 38, 17, "#123631");
      fillPixel(x + 28, 83, 30, 31, "#123631");
      fillPixel(x + 52, 104, 37, 20, "#123631");
    }

    const midOffset = Math.floor(elapsed * speed * 0.09) % 126;
    for (let x = -126 - midOffset; x < WIDTH + 126; x += 126) {
      fillPixel(x + 8, 145, 25, 72, colors.leafDark);
      fillPixel(x, 131, 49, 23, colors.mid);
      fillPixel(x + 39, 118, 46, 39, colors.mid);
      fillPixel(x + 76, 139, 42, 25, colors.mid);
      fillPixel(x + 50, 151, 12, 66, "#163126");
    }

    fillPixel(0, 181, WIDTH, 36, "#16292a");
    fillPixel(0, 190, WIDTH, 4, "#29473f");
    fillPixel(0, GROUND, WIDTH, HEIGHT - GROUND, "#101a20");
    fillPixel(0, GROUND, WIDTH, 4, "#556358");
    fillPixel(0, GROUND + 4, WIDTH, 3, "#263b38");

    const groundOffset = Math.floor(elapsed * speed) % 50;
    for (let x = -50 - groundOffset; x < WIDTH + 50; x += 50) {
      fillPixel(x + 7, GROUND + 13, 21, 3, "#26353a");
      fillPixel(x + 31, GROUND + 28, 12, 3, "#1b292f");
      fillPixel(x + 2, GROUND + 36, 7, 2, "#38443f");
    }
  }

  function drawWall(wall) {
    const x = Math.round(wall.x);
    const y = Math.round(wall.y);
    const capSteps = [5, 0, 3, -4, 2, -1];
    fillPixel(x + 2, y + 4, wall.width - 2, wall.height - 4, colors.stoneDark);

    for (let rowY = y + 5, row = 0; rowY < GROUND; rowY += 14, row += 1) {
      const offset = row % 2 ? -5 : 2;
      for (let blockX = x + offset; blockX < x + wall.width; blockX += 19) {
        const right = Math.min(blockX + 17, x + wall.width - 2);
        if (right <= x + 2) continue;
        const shade = (row + blockX + wall.seed) % 3;
        fillPixel(
          Math.max(x + 3, blockX),
          rowY,
          right - Math.max(x + 3, blockX),
          11,
          shade === 0 ? colors.stoneLight : colors.stone,
        );
        fillPixel(Math.max(x + 4, blockX + 3), rowY + 2, 6, 2, shade === 0 ? colors.stoneEdge : "#53656d");
      }
    }

    for (let i = 0; i < Math.ceil(wall.width / 10); i += 1) {
      const capX = x + i * 10;
      const capY = y + capSteps[(i + wall.seed) % capSteps.length];
      fillPixel(capX, capY, Math.min(12, x + wall.width - capX), 7, colors.stoneLight);
      fillPixel(capX + 2, capY, Math.min(7, x + wall.width - capX - 2), 2, colors.stoneEdge);
      fillPixel(capX, capY + 7, Math.min(10, x + wall.width - capX), 3, colors.moss);
    }

    const vineX = x + 7 + (wall.seed % Math.max(8, wall.width - 15));
    pixelSegment(vineX, y + 3, vineX + 2, y + Math.min(28, wall.height - 6), 3, "#376a3b");
    fillPixel(vineX - 5, y + 17, 6, 4, colors.leafLight);
    fillPixel(vineX + 2, y + 25, 6, 4, colors.moss);
  }

  function drawIvern() {
    const airborne = !player.grounded;
    const stride = airborne ? 0.35 : Math.sin(player.phase);
    const sway = airborne ? 1 : Math.round(Math.sin(player.phase * 0.5) * 3);
    const bob = airborne ? 0 : Math.abs(Math.round(Math.cos(player.phase))) * 2;
    const baseX = Math.round(player.x + 17 + sway);
    const baseY = Math.round(player.y + bob);

    const hipX = baseX - sway * 0.25;
    const hipY = baseY + 59;
    const shoulderX = baseX + sway * 0.5;
    const shoulderY = baseY + 31;
    const leftFootX = hipX - 7 + stride * 8;
    const rightFootX = hipX + 7 - stride * 8;
    const leftKneeX = hipX - 5 - stride * 4;
    const rightKneeX = hipX + 5 + stride * 4;

    pixelSegment(hipX - 3, hipY, leftKneeX, hipY + 14, 6, colors.barkDark);
    pixelSegment(leftKneeX, hipY + 14, leftFootX, baseY + 82, 5, colors.bark);
    pixelSegment(hipX + 3, hipY, rightKneeX, hipY + 14, 6, colors.bark);
    pixelSegment(rightKneeX, hipY + 14, rightFootX, baseY + 82, 5, colors.barkLight);
    fillPixel(leftFootX - 7, baseY + 80, 11, 5, colors.barkDark);
    fillPixel(rightFootX - 3, baseY + 80, 11, 5, colors.barkDark);

    const armSwing = stride * 10;
    pixelSegment(shoulderX - 5, shoulderY + 3, shoulderX - 11 - armSwing * 0.4, baseY + 47, 5, colors.bark);
    pixelSegment(shoulderX - 11 - armSwing * 0.4, baseY + 47, shoulderX - 5 - armSwing, baseY + 60, 4, colors.barkLight);
    pixelSegment(shoulderX + 5, shoulderY + 3, shoulderX + 10 + armSwing * 0.4, baseY + 47, 5, colors.barkLight);
    pixelSegment(shoulderX + 10 + armSwing * 0.4, baseY + 47, shoulderX + 4 + armSwing, baseY + 61, 4, colors.bark);
    fillPixel(shoulderX - 8 - armSwing, baseY + 59, 7, 4, colors.leafLight);
    fillPixel(shoulderX + 2 + armSwing, baseY + 60, 7, 4, colors.leafLight);

    fillPixel(baseX - 7, baseY + 29, 15, 33, colors.barkDark);
    fillPixel(baseX - 4, baseY + 31, 10, 29, colors.bark);
    fillPixel(baseX - 7, baseY + 37, 4, 12, colors.moss);
    fillPixel(baseX + 5, baseY + 43, 4, 10, colors.leafLight);
    fillPixel(baseX - 9, baseY + 56, 19, 7, colors.leafDark);

    fillPixel(baseX - 5, baseY + 23, 10, 9, colors.barkLight);
    fillPixel(baseX - 9, baseY + 9, 18, 17, colors.face);
    fillPixel(baseX - 10, baseY + 12, 4, 11, colors.barkDark);
    fillPixel(baseX + 7, baseY + 13, 4, 10, colors.barkDark);
    fillPixel(baseX - 5, baseY + 15, 3, 3, colors.eye);
    fillPixel(baseX + 3, baseY + 15, 3, 3, colors.eye);
    fillPixel(baseX - 1, baseY + 20, 4, 3, "#8a744f");

    fillPixel(baseX - 12, baseY + 5, 9, 8, colors.leaf);
    fillPixel(baseX + 4, baseY + 4, 10, 9, colors.leafLight);
    fillPixel(baseX - 5, baseY, 8, 11, colors.moss);
    fillPixel(baseX - 15, baseY + 1, 7, 7, colors.leafLight);
    fillPixel(baseX + 10, baseY - 3, 6, 10, colors.leaf);
    fillPixel(baseX - 8, baseY - 5, 5, 9, colors.leafLight);
    fillPixel(baseX + 1, baseY - 7, 5, 10, colors.moss);

    if (state === "running" && !reducedMotion.matches) {
      fillPixel(baseX + 13, baseY + 28, 2, 2, colors.gold);
    }
  }

  function drawParticles() {
    particles.forEach((particle) => {
      const shade = particle.life > 0.2 ? "#71817a" : "#3b4d49";
      fillPixel(particle.x, particle.y, 4, 3, shade);
    });
  }

  function draw() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    drawBackground();
    obstacles.forEach(drawWall);
    drawParticles();
    drawIvern();

    if (flashTimer > 0) {
      ctx.globalAlpha = Math.min(0.55, flashTimer * 3);
      fillPixel(0, 0, WIDTH, HEIGHT, "#d9b865");
      ctx.globalAlpha = 1;
    }
  }

  function frame(now) {
    const dt = Math.min(0.032, Math.max(0, (now - lastTime) / 1000));
    lastTime = now;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  function handleKey(event) {
    if (["Space", "ArrowUp", "KeyW"].includes(event.code)) {
      event.preventDefault();
      jump();
    } else if (event.code === "KeyR") {
      event.preventDefault();
      resetGame();
    }
  }

  startButton.addEventListener("click", resetGame);
  canvas.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    jump();
  });
  window.addEventListener("keydown", handleKey);
  document.addEventListener("visibilitychange", () => {
    lastTime = performance.now();
  });

  setMessage("idle");
  requestAnimationFrame(frame);
})();
