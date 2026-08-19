(() => {
  const root = document.querySelector("[data-jungle-runner]");
  if (!root) return;

  const canvas = root.querySelector("[data-runner-canvas]");
  const statusNode = root.querySelector("[data-runner-status]");
  const ctx = canvas?.getContext("2d");
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;
  const GROUND = 252;
  const BG = "#f4f4f2";
  const INK = "#151515";
  const STORAGE_KEY = "lhyzs.daisyRunner.best";
  const LEGACY_STORAGE_KEY = "lhyzs.ivernRunner.best";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const sprite = new Image();
  const spriteLayer = document.createElement("canvas");
  const spriteCtx = spriteLayer.getContext("2d");

  sprite.src = root.dataset.sprite;
  spriteLayer.width = 64;
  spriteLayer.height = 64;
  ctx.imageSmoothingEnabled = false;
  spriteCtx.imageSmoothingEnabled = false;

  const stars = Array.from({ length: 31 }, (_, index) => ({
    x: 24 + ((index * 83 + index * index * 7) % (W - 48)),
    y: 20 + ((index * 47 + index * 11) % 142),
    type: index % 5,
  }));

  let state = "idle";
  let lastTime = performance.now();
  let elapsed = 0;
  let distance = 0;
  let best = readBest();
  let speed = 218;
  let spawnTimer = 1.55;
  let jumpBuffer = 0;
  let coyoteTime = 0;
  let obstacles = [];
  let player = createPlayer();

  function readBest() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY) ?? "0";
      const saved = Number.parseInt(stored, 10);
      return Number.isFinite(saved) ? Math.max(0, saved) : 0;
    } catch (_error) {
      return 0;
    }
  }

  function saveBest(value) {
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch (_error) {
      // Storage is optional; gameplay remains available without it.
    }
  }

  function createPlayer() {
    return {
      x: 78,
      y: GROUND - 46,
      width: 36,
      height: 46,
      velocityY: 0,
      grounded: true,
      phase: 0,
    };
  }

  function resetGame() {
    state = "running";
    elapsed = 0;
    distance = 0;
    speed = 218;
    spawnTimer = 1.35;
    jumpBuffer = 0;
    coyoteTime = 0.09;
    obstacles = [];
    player = createPlayer();
    statusNode.textContent = "游戏进行中";
    canvas.focus({ preventScroll: true });
  }

  function endGame() {
    if (state !== "running") return;
    state = "gameover";
    const score = Math.floor(distance);
    if (score > best) {
      best = score;
      saveBest(best);
    }
    statusNode.textContent = `游戏结束，本次里程 ${score} 米`;
  }

  function requestJump() {
    if (state !== "running") {
      resetGame();
      jumpBuffer = 0.12;
      return;
    }
    jumpBuffer = 0.12;
  }

  function performJump() {
    player.velocityY = -365;
    player.grounded = false;
    coyoteTime = 0;
    jumpBuffer = 0;
  }

  function spawnObstacle() {
    // The 38 px ceiling stays safely below the 53 px jump apex.
    const height = 20 + Math.floor(Math.random() * 19);
    const width = 17 + Math.floor(Math.random() * 12);
    obstacles.push({
      x: W + 8,
      y: GROUND - height,
      width,
      height,
      notch: Math.floor(Math.random() * 4),
    });

    // Distance-based spacing remains fair as the game accelerates.
    const safeDistance = speed * 0.82 + Math.random() * 72;
    spawnTimer = safeDistance / speed;
  }

  function update(dt) {
    if (state !== "running") {
      if (!reducedMotion.matches) player.phase += dt * 2.2;
      return;
    }

    elapsed += dt;
    distance += dt * (speed / 19);
    speed = Math.min(292, 218 + distance * 0.16);
    player.phase += dt * (speed / 19);

    jumpBuffer = Math.max(0, jumpBuffer - dt);
    coyoteTime = player.grounded ? 0.09 : Math.max(0, coyoteTime - dt);
    if (jumpBuffer > 0 && coyoteTime > 0) performJump();

    player.velocityY += 1280 * dt;
    player.y += player.velocityY * dt;
    if (player.y >= GROUND - player.height) {
      player.y = GROUND - player.height;
      player.velocityY = 0;
      player.grounded = true;
      if (jumpBuffer > 0) performJump();
    } else {
      player.grounded = false;
    }

    spawnTimer -= dt;
    if (spawnTimer <= 0) spawnObstacle();
    obstacles.forEach((wall) => {
      wall.x -= speed * dt;
    });
    obstacles = obstacles.filter((wall) => wall.x + wall.width > -10);

    const hitbox = {
      x: player.x + 5,
      y: player.y + 4,
      width: player.width - 10,
      height: player.height - 6,
    };
    for (const wall of obstacles) {
      if (
        hitbox.x < wall.x + wall.width - 2 &&
        hitbox.x + hitbox.width > wall.x + 2 &&
        hitbox.y < wall.y + wall.height &&
        hitbox.y + hitbox.height > wall.y + 3
      ) {
        endGame();
        break;
      }
    }
  }

  function pixelRect(x, y, width, height, color = INK) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
  }

  function drawStars() {
    ctx.globalAlpha = 0.68;
    stars.forEach((star) => {
      const drift = state === "running" && !reducedMotion.matches ? (elapsed * speed * 0.025) % W : 0;
      const x = (star.x - drift + W) % W;
      const y = star.y;
      if (star.type === 0) {
        pixelRect(x + 2, y, 2, 6);
        pixelRect(x, y + 2, 6, 2);
      } else if (star.type === 1) {
        pixelRect(x + 1, y, 1, 5);
        pixelRect(x, y + 2, 3, 1);
      } else {
        pixelRect(x, y, star.type === 2 ? 2 : 1, star.type === 2 ? 2 : 1);
      }
    });
    ctx.globalAlpha = 1;
  }

  function draw404() {
    const digits = [
      ["10001", "10001", "11111", "00001", "00001"],
      ["11111", "10001", "10001", "10001", "11111"],
      ["10001", "10001", "11111", "00001", "00001"],
    ];
    const pixel = 4;
    const gap = 7;
    const totalWidth = digits.length * 5 * pixel + (digits.length - 1) * gap;
    const startX = Math.round((W - totalWidth) / 2);
    const startY = 52;

    ctx.globalAlpha = 0.16;
    digits.forEach((digit, digitIndex) => {
      digit.forEach((row, rowIndex) => {
        [...row].forEach((bit, columnIndex) => {
          if (bit === "1") {
            pixelRect(
              startX + digitIndex * (5 * pixel + gap) + columnIndex * pixel,
              startY + rowIndex * pixel,
              3,
              3,
            );
          }
        });
      });
    });
    ctx.globalAlpha = 1;
  }

  function drawGround() {
    pixelRect(0, GROUND, W, 2);
    const offset = state === "running" ? Math.floor(elapsed * speed) % 34 : 0;
    for (let x = -34 - offset; x < W + 34; x += 34) {
      pixelRect(x + 8, GROUND + 11, 9, 2);
      if ((x / 34) % 3 === 0) pixelRect(x + 25, GROUND + 20, 3, 2);
    }
  }

  function drawWall(wall) {
    const x = Math.round(wall.x);
    const y = Math.round(wall.y);
    pixelRect(x + 2, y + 3, wall.width - 3, wall.height - 3);
    pixelRect(x, y + 5 + wall.notch, wall.width, wall.height - 8 - wall.notch);
    pixelRect(x + 3, y + 1, Math.max(5, Math.floor(wall.width * 0.48)), 4);
    pixelRect(x + wall.width - 7, y + 3, 7, 4);
    if (wall.notch % 2 === 0) {
      pixelRect(x - 3, y + 9, 5, 3);
      pixelRect(x - 5, y + 7, 3, 2);
    } else {
      pixelRect(x + wall.width - 1, y + 12, 5, 3);
    }
  }

  function drawDaisy() {
    const frameIndex = state === "running" && !reducedMotion.matches
      ? Math.floor(player.phase / 0.95) % 8
      : 0;
    const frameWidth = sprite.naturalWidth / 4;
    const frameHeight = sprite.naturalHeight / 2;
    const sourceX = (frameIndex % 4) * frameWidth;
    const sourceY = Math.floor(frameIndex / 4) * frameHeight;
    const bob = player.grounded ? [0, 1, 0, -1, 0, 1, 0, -1][frameIndex] : -1;
    const drawX = Math.round(player.x + player.width / 2 - spriteLayer.width / 2);
    const drawY = Math.round(player.y - 13 + bob);

    if (sprite.complete && sprite.naturalWidth) {
      spriteCtx.clearRect(0, 0, spriteLayer.width, spriteLayer.height);
      spriteCtx.globalCompositeOperation = "source-over";
      spriteCtx.drawImage(
        sprite,
        sourceX,
        sourceY,
        frameWidth,
        frameHeight,
        0,
        0,
        spriteLayer.width,
        spriteLayer.height,
      );
      spriteCtx.globalCompositeOperation = "source-in";
      spriteCtx.fillStyle = INK;
      spriteCtx.fillRect(0, 0, spriteLayer.width, spriteLayer.height);
      spriteCtx.globalCompositeOperation = "source-over";
      ctx.drawImage(spriteLayer, drawX, drawY);
      return;
    }

    pixelRect(player.x + 5, player.y + 8, 27, 28);
    pixelRect(player.x, player.y + 14, 10, 19);
    pixelRect(player.x + 27, player.y + 14, 12, 18);
    pixelRect(player.x + 7, player.y + 2, 22, 11);
    pixelRect(player.x + 8, player.y - 3, 5, 7);
    pixelRect(player.x + 17, player.y - 4, 5, 8);
    pixelRect(player.x + 25, player.y - 2, 5, 6);
  }

  function formatScore(value) {
    return String(Math.max(0, Math.floor(value))).padStart(5, "0");
  }

  function drawScore() {
    ctx.fillStyle = INK;
    ctx.globalAlpha = 0.62;
    ctx.font = "700 12px 'JetBrains Mono', monospace";
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillText(`HI ${formatScore(best)}  ${formatScore(distance)}`, W - 16, 15);
    ctx.globalAlpha = 1;
  }

  function drawIdlePrompt() {
    if (state !== "idle") return;
    ctx.fillStyle = INK;
    ctx.globalAlpha = 0.72;
    ctx.font = "700 12px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("按 SPACE / ↑ / W 开始 · 点击亦可", W / 2, 137);
    ctx.globalAlpha = 1;
  }

  function drawGameOver() {
    if (state !== "gameover") return;
    const centerX = W / 2;
    ctx.fillStyle = INK;
    ctx.font = "700 15px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("G A M E  O V E R", centerX, 123);

    // Clockwise replay arrow with an intentionally large opening on the left.
    pixelRect(centerX - 10, 139, 15, 2);
    pixelRect(centerX - 8, 136, 2, 3);
    pixelRect(centerX - 8, 141, 2, 3);
    pixelRect(centerX + 5, 141, 3, 2);
    pixelRect(centerX + 7, 143, 2, 7);
    pixelRect(centerX + 5, 150, 3, 2);
    pixelRect(centerX - 3, 152, 8, 2);
    pixelRect(centerX - 6, 150, 3, 2);
    pixelRect(centerX - 8, 147, 2, 3);

    ctx.fillStyle = INK;
    ctx.globalAlpha = 0.68;
    ctx.font = "700 11px 'JetBrains Mono', monospace";
    ctx.fillText("SPACE / R 重新开始", centerX, 173);
    ctx.globalAlpha = 1;
  }

  function draw() {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);
    drawStars();
    draw404();
    drawGround();
    obstacles.forEach(drawWall);
    drawDaisy();
    drawScore();
    drawIdlePrompt();
    drawGameOver();
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
      requestJump();
    } else if (event.code === "KeyR") {
      event.preventDefault();
      resetGame();
    }
  }

  canvas.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    requestJump();
  });
  window.addEventListener("keydown", handleKey);
  document.addEventListener("visibilitychange", () => {
    lastTime = performance.now();
  });

  requestAnimationFrame(frame);
})();
