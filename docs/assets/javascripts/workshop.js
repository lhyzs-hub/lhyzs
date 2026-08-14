(() => {
  const root = document.querySelector("#hex-workshop");
  if (!root || root.dataset.ready === "true") return;
  root.dataset.ready = "true";

  const WIDTH = 9;
  const HEIGHT = 6;
  const GAME_KEY = "hextech-workshop";
  const NAME_STORAGE = "lhyzs-workshop-player-name";
  const COMPLETE_STORAGE = "lhyzs-workshop-complete";
  const PARTS = {
    shaft: { label: "传动轴", energy: 2, ports: ["E", "W"] },
    elbow: { label: "转向节", energy: 3, ports: ["N", "E"] },
    gear: { label: "齿轮组", energy: 5, ports: ["N", "E", "S", "W"] },
    belt: { label: "低耗皮带", energy: 1, ports: ["E", "W"] },
    tee: { label: "三通联轴", energy: 4, ports: ["N", "E", "W"] },
  };
  const DIRECTIONS = ["N", "E", "S", "W"];
  const OPPOSITE = { N: "S", E: "W", S: "N", W: "E" };
  const DELTA = { N: -WIDTH, E: 1, S: WIDTH, W: -1 };
  const ROTATE = { N: "E", E: "S", S: "W", W: "N" };

  const LEVELS = {
    core: {
      code: "BLUEPRINT 01",
      title: "核心点火",
      objective: "绕开损坏区域，将电机动力传至海克斯核心。",
      mode: "core",
      source: { index: 18, ports: ["E"] },
      targets: [{ index: 26, ports: ["S"] }],
      blocks: [22, 23],
      inventory: { shaft: 7, elbow: 4, gear: 1, belt: 3, tee: 0 },
      optimalParts: 10,
      optimalEnergy: 20,
    },
    poro: {
      code: "BLUEPRINT 02",
      title: "魄罗输运",
      objective: "铺设连续传动线路，把魄罗从下层货台送至上层站台。",
      mode: "poro",
      source: { index: 45, ports: ["E"] },
      targets: [{ index: 8, ports: ["S"] }],
      blocks: [10, 11, 19, 28, 29, 38, 39, 40],
      inventory: { shaft: 8, elbow: 6, gear: 2, belt: 5, tee: 0 },
      optimalParts: 13,
      optimalEnergy: 25,
    },
    gate: {
      code: "BLUEPRINT 03",
      title: "双路机关",
      objective: "用三通联轴器分配动力，同时开启上下两道机关门。",
      mode: "gate",
      source: { index: 27, ports: ["E"] },
      targets: [{ index: 8, ports: ["S"] }, { index: 53, ports: ["W"] }],
      blocks: [3, 4, 12, 13, 21, 39, 48],
      inventory: { shaft: 10, elbow: 7, gear: 2, belt: 5, tee: 2 },
      optimalParts: 16,
      optimalEnergy: 36,
    },
  };

  const DAILY_VARIANTS = [
    { source: { index: 18, ports: ["E"] }, targets: [{ index: 35, ports: ["N"] }], blocks: [4, 13, 22, 31], inventory: { shaft: 8, elbow: 5, gear: 1, belt: 4, tee: 0 }, optimalParts: 11, optimalEnergy: 22 },
    { source: { index: 45, ports: ["E"] }, targets: [{ index: 17, ports: ["S"] }], blocks: [11, 20, 29, 38, 39], inventory: { shaft: 9, elbow: 5, gear: 1, belt: 5, tee: 0 }, optimalParts: 12, optimalEnergy: 23 },
    { source: { index: 9, ports: ["E"] }, targets: [{ index: 44, ports: ["N"] }], blocks: [3, 12, 21, 30, 31], inventory: { shaft: 8, elbow: 6, gear: 2, belt: 4, tee: 0 }, optimalParts: 12, optimalEnergy: 25 },
    { source: { index: 27, ports: ["E"] }, targets: [{ index: 8, ports: ["S"] }, { index: 53, ports: ["W"] }], blocks: [4, 13, 22, 31, 40], inventory: { shaft: 11, elbow: 7, gear: 2, belt: 5, tee: 2 }, optimalParts: 17, optimalEnergy: 37 },
    { source: { index: 0, ports: ["E"] }, targets: [{ index: 52, ports: ["N"] }], blocks: [12, 13, 14, 29, 30, 31], inventory: { shaft: 10, elbow: 6, gear: 2, belt: 5, tee: 0 }, optimalParts: 14, optimalEnergy: 28 },
    { source: { index: 36, ports: ["E"] }, targets: [{ index: 17, ports: ["S"] }, { index: 44, ports: ["N"] }], blocks: [4, 13, 22, 40, 49], inventory: { shaft: 12, elbow: 7, gear: 2, belt: 6, tee: 2 }, optimalParts: 18, optimalEnergy: 38 },
    { source: { index: 9, ports: ["E"] }, targets: [{ index: 53, ports: ["W"] }], blocks: [2, 11, 20, 38, 47], inventory: { shaft: 10, elbow: 6, gear: 2, belt: 5, tee: 0 }, optimalParts: 14, optimalEnergy: 28 },
  ];

  const pad = (value) => String(value).padStart(2, "0");
  const localDateKey = (date = new Date()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const dateKey = localDateKey();
  const epochDay = Math.floor(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()) / 86400000);
  LEVELS.daily = {
    ...DAILY_VARIANTS[((epochDay % DAILY_VARIANTS.length) + DAILY_VARIANTS.length) % DAILY_VARIANTS.length],
    code: `DAILY / ${dateKey.replaceAll("-", ".")}`,
    title: "每日蓝图",
    objective: "今日所有机械师面对同一张蓝图；以更少零件、更低能耗和更短时间争夺榜首。",
    mode: "daily",
  };

  const board = root.querySelector("#workshop-board");
  const tray = root.querySelector("#workshop-tray");
  const levelTabs = [...root.querySelectorAll("[data-level]")];
  const levelCode = root.querySelector("#workshop-level-code");
  const levelTitle = root.querySelector("#workshop-level-title");
  const objective = root.querySelector("#workshop-objective");
  const partsLabel = root.querySelector("#workshop-parts");
  const energyLabel = root.querySelector("#workshop-energy");
  const timeLabel = root.querySelector("#workshop-time");
  const message = root.querySelector("#workshop-message");
  const removeButton = root.querySelector("#workshop-remove");
  const resetButton = root.querySelector("#workshop-reset");
  const runButton = root.querySelector("#workshop-run");
  const resultPanel = root.querySelector("#workshop-result");
  const resultClose = root.querySelector("#workshop-result-close");
  const nextButton = root.querySelector("#workshop-next");
  const starsElement = root.querySelector("#workshop-stars");
  const scoreElement = root.querySelector("#workshop-score");
  const dateElement = root.querySelector("#workshop-date");
  const leaderboard = root.querySelector("#workshop-leaderboard");
  const boardStatus = root.querySelector("#workshop-board-status");
  const scoreForm = root.querySelector("#workshop-score-form");
  const scoreInput = scoreForm.elements.name;
  const scoreSubmit = scoreForm.querySelector("button[type='submit']");
  const turnstile = scoreForm.querySelector("[data-workshop-turnstile]");
  const security = window.LHYZS_SECURITY;
  const config = window.LHYZS_SUPABASE || {};
  const supabaseClient = config.url && config.publishableKey && window.supabase?.createClient
    ? window.supabase.createClient(config.url, config.publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: "lhyzs-workshop-public" },
    })
    : null;

  let activeKey = "core";
  let activeLevel = LEVELS.core;
  let placements = new Map();
  let selectedPart = "shaft";
  let removeMode = false;
  let startedAt = performance.now();
  let solvedAt = 0;
  let ticker;
  let runId = "";
  let submitted = false;
  let lastResult = null;
  let dragPayload = null;
  let audioContext;

  const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);

  const beep = (frequency, duration = 0.06, volume = 0.025) => {
    try {
      audioContext ||= new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      gain.gain.setValueAtTime(volume, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration);
    } catch (_) {
      // Audio feedback is optional.
    }
  };

  const setMessage = (text, tone = "idle") => {
    message.textContent = text;
    message.dataset.tone = tone;
  };

  const setBoardStatus = (text, tone = "ready") => {
    boardStatus.textContent = text;
    boardStatus.dataset.tone = tone;
  };

  const rotatePorts = (ports, rotation) => ports.map((port) => {
    let rotated = port;
    for (let step = 0; step < rotation; step += 1) rotated = ROTATE[rotated];
    return rotated;
  });

  const mechanismHtml = (type, rotation = 0) => `
    <span class="mechanism mechanism--${type}" style="--rotation:${rotation * 90}deg" aria-hidden="true">
      <i class="mechanism__hub"></i>
    </span>`;

  const pieceAt = (index) => {
    if (index === activeLevel.source.index) return { type: "motor", rotation: 0, ports: activeLevel.source.ports, fixed: true };
    const target = activeLevel.targets.find((item) => item.index === index);
    if (target) return { type: "target", rotation: 0, ports: target.ports, fixed: true };
    const placement = placements.get(index);
    if (!placement) return null;
    return { ...placement, ports: rotatePorts(PARTS[placement.type].ports, placement.rotation) };
  };

  const usedCount = (type) => [...placements.values()].filter((piece) => piece.type === type).length;
  const metrics = () => {
    const pieces = [...placements.values()];
    return {
      parts: pieces.length,
      energy: pieces.reduce((total, piece) => total + PARTS[piece.type].energy, 0),
    };
  };

  const validNeighbor = (index, direction) => {
    const row = Math.floor(index / WIDTH);
    const column = index % WIDTH;
    if (direction === "N" && row === 0) return -1;
    if (direction === "S" && row === HEIGHT - 1) return -1;
    if (direction === "W" && column === 0) return -1;
    if (direction === "E" && column === WIDTH - 1) return -1;
    return index + DELTA[direction];
  };

  const tracePower = () => {
    const source = activeLevel.source.index;
    const visited = new Set([source]);
    const parent = new Map();
    const queue = [source];
    while (queue.length) {
      const index = queue.shift();
      const piece = pieceAt(index);
      for (const direction of piece?.ports || []) {
        const neighborIndex = validNeighbor(index, direction);
        if (neighborIndex < 0 || visited.has(neighborIndex)) continue;
        const neighbor = pieceAt(neighborIndex);
        if (!neighbor?.ports.includes(OPPOSITE[direction])) continue;
        visited.add(neighborIndex);
        parent.set(neighborIndex, index);
        queue.push(neighborIndex);
      }
    }
    const poweredTargets = activeLevel.targets.filter((target) => visited.has(target.index));
    return { visited, parent, poweredTargets, success: poweredTargets.length === activeLevel.targets.length };
  };

  const renderStats = () => {
    const current = metrics();
    partsLabel.textContent = String(current.parts);
    energyLabel.textContent = String(current.energy);
  };

  const renderTray = () => {
    tray.innerHTML = Object.entries(PARTS).map(([type, part]) => {
      const limit = activeLevel.inventory[type] || 0;
      const remaining = Math.max(0, limit - usedCount(type));
      return `<button class="workshop-part${selectedPart === type && !removeMode ? " is-selected" : ""}" type="button" data-part="${type}" draggable="${remaining > 0}" ${remaining < 1 ? "disabled" : ""} aria-pressed="${selectedPart === type && !removeMode}">
        ${mechanismHtml(type)}<span>${part.label}<small> · ${part.energy}E</small></span><strong>×${remaining}</strong>
      </button>`;
    }).join("");
  };

  const renderBoard = (powered = new Set()) => {
    board.innerHTML = "";
    for (let index = 0; index < WIDTH * HEIGHT; index += 1) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "workshop-cell";
      cell.dataset.index = String(index);
      cell.setAttribute("role", "gridcell");
      const piece = pieceAt(index);
      if (activeLevel.blocks.includes(index)) {
        cell.classList.add("is-blocked");
        cell.setAttribute("aria-label", "损坏区域");
        cell.disabled = true;
      } else if (piece) {
        if (piece.type === "motor") cell.classList.add("is-source");
        if (piece.type === "target") cell.classList.add("is-target");
        if (powered.has(index)) cell.classList.add("is-powered");
        cell.innerHTML = mechanismHtml(piece.type, piece.rotation);
        cell.setAttribute("aria-label", piece.fixed ? (piece.type === "motor" ? "动力电机" : "目标装置") : `${PARTS[piece.type].label}，点击旋转`);
        if (!piece.fixed) cell.draggable = true;
      } else {
        cell.setAttribute("aria-label", `空格 ${Math.floor(index / WIDTH) + 1}-${index % WIDTH + 1}`);
      }
      board.append(cell);
    }
    renderStats();
    renderTray();
  };

  const clearPower = () => {
    board.querySelectorAll(".is-powered").forEach((cell) => cell.classList.remove("is-powered"));
    board.querySelector(".workshop-poro")?.remove();
  };

  const invalidateSolvedState = () => {
    if (!solvedAt) return;
    solvedAt = 0;
    lastResult = null;
    resultPanel.hidden = true;
    scoreForm.hidden = true;
  };

  const elapsedMs = () => Math.max(1000, Math.round((solvedAt || performance.now()) - startedAt));
  const formatTime = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    return `${pad(Math.floor(totalSeconds / 60))}:${pad(totalSeconds % 60)}`;
  };

  const calculateScore = (parts, energy, durationMs) => Math.max(100, 2000 - parts * 70 - energy * 25 - Math.ceil(durationMs / 1000) * 4);
  const calculateStars = (score, parts, energy) => {
    if (parts <= activeLevel.optimalParts && energy <= activeLevel.optimalEnergy) return 3;
    if (score >= 950) return 2;
    return 1;
  };

  const animatePoro = (trace) => {
    if (activeLevel.mode !== "poro") return;
    const targetIndex = activeLevel.targets[0].index;
    const path = [targetIndex];
    while (trace.parent.has(path[path.length - 1])) path.push(trace.parent.get(path[path.length - 1]));
    path.reverse();
    const poro = document.createElement("span");
    poro.className = "workshop-poro";
    poro.setAttribute("aria-hidden", "true");
    poro.innerHTML = "<i></i>";
    board.append(poro);
    const boardRect = board.getBoundingClientRect();
    const cellWidth = boardRect.width / WIDTH;
    const cellHeight = boardRect.height / HEIGHT;
    const keyframes = path.map((index) => ({
      transform: `translate(${(index % WIDTH + 0.5) * cellWidth - 12}px, ${(Math.floor(index / WIDTH) + 0.5) * cellHeight - 12}px)`,
    }));
    poro.animate(keyframes, { duration: Math.max(1400, path.length * 180), easing: "steps(2, end)", fill: "forwards" });
  };

  const renderResult = async (trace) => {
    solvedAt = performance.now();
    const current = metrics();
    const duration = elapsedMs();
    const score = calculateScore(current.parts, current.energy, duration);
    const stars = calculateStars(score, current.parts, current.energy);
    lastResult = { score, stars, durationMs: duration, ...current };
    scoreElement.textContent = String(score).padStart(4, "0");
    starsElement.innerHTML = [1, 2, 3].map((star) => `<i class="${star <= stars ? "is-earned" : ""}"></i>`).join("");
    starsElement.setAttribute("aria-label", `${stars} 星评分`);
    resultPanel.hidden = false;
    scoreForm.hidden = activeKey !== "daily" || submitted;
    if (activeKey === "daily" && !submitted) await mountVerification();
    const completed = new Set(JSON.parse(localStorage.getItem(COMPLETE_STORAGE) || "[]"));
    completed.add(activeKey);
    localStorage.setItem(COMPLETE_STORAGE, JSON.stringify([...completed]));
    levelTabs.find((tab) => tab.dataset.level === activeKey)?.classList.add("is-complete");
    beep(523, 0.1, 0.035);
    window.setTimeout(() => beep(659, 0.12, 0.03), 110);
    window.setTimeout(() => beep(784, 0.18, 0.025), 230);
    animatePoro(trace);
  };

  const runMachine = () => {
    clearPower();
    const trace = tracePower();
    trace.visited.forEach((index) => board.querySelector(`[data-index="${index}"]`)?.classList.add("is-powered"));
    if (!trace.success) {
      const missing = activeLevel.targets.length - trace.poweredTargets.length;
      setMessage(`动力链未闭合：还有 ${missing} 个目标没有接收到动力。`, "warning");
      beep(155, 0.12, 0.02);
      return;
    }
    setMessage("传动校验通过，装置已稳定运转。", "success");
    renderResult(trace);
  };

  const placePiece = (index, type, sourceIndex = null) => {
    if (!PARTS[type] || activeLevel.blocks.includes(index) || pieceAt(index)) return;
    if (sourceIndex === null && usedCount(type) >= (activeLevel.inventory[type] || 0)) return;
    invalidateSolvedState();
    if (sourceIndex !== null) placements.delete(sourceIndex);
    placements.set(index, { type, rotation: 0 });
    clearPower();
    renderBoard();
    setMessage(`${PARTS[type].label}已装入；点击零件可旋转。`);
    beep(270, 0.045, 0.018);
  };

  const resetLevel = async () => {
    placements = new Map();
    selectedPart = "shaft";
    removeMode = false;
    solvedAt = 0;
    lastResult = null;
    submitted = false;
    resultPanel.hidden = true;
    scoreForm.hidden = true;
    startedAt = performance.now();
    removeButton.classList.remove("is-active");
    renderBoard();
    setMessage("选择零件并铺设传动路径；点击已放置的零件可旋转。");
    if (activeKey === "daily") await armDailyRun();
  };

  const selectLevel = async (key) => {
    if (!LEVELS[key]) return;
    activeKey = key;
    activeLevel = LEVELS[key];
    levelTabs.forEach((tab) => {
      const active = tab.dataset.level === key;
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    levelCode.textContent = activeLevel.code;
    levelTitle.textContent = activeLevel.title;
    objective.textContent = activeLevel.objective;
    nextButton.textContent = key === "daily" ? "再次挑战" : "下一蓝图";
    await resetLevel();
  };

  const armDailyRun = async () => {
    runId = "";
    if (!security?.configured) {
      setBoardStatus("只读", "error");
      return;
    }
    try {
      const result = await security.submit("start_game", { gameKey: GAME_KEY, challengeKey: dateKey });
      runId = result.runId || "";
    } catch (error) {
      console.error("Unable to arm workshop run", error);
      setBoardStatus("登记暂停", "error");
    }
  };

  const mountVerification = async () => {
    if (!security?.configured || !runId) {
      scoreSubmit.disabled = true;
      return;
    }
    try {
      security.reset(turnstile);
      await security.mount(turnstile, "score");
      scoreSubmit.disabled = false;
    } catch (error) {
      console.error("Unable to mount workshop verification", error);
      scoreSubmit.disabled = true;
      setBoardStatus("验证失败", "error");
    }
  };

  const renderLeaderboard = (entries = []) => {
    if (!entries.length) {
      leaderboard.innerHTML = '<li class="workshop-board-panel__empty">今日还没有方案记录<br>第一名正在等待机械师</li>';
      return;
    }
    leaderboard.innerHTML = entries.map((entry, index) => `<li>
      <i>${index + 1}</i><span>${escapeHtml(entry.player_name)}</span>
      <strong>${entry.score}<small>${entry.parts_used}件 · ${Math.ceil(entry.duration_ms / 1000)}s</small></strong>
    </li>`).join("");
  };

  const loadLeaderboard = async (quiet = false) => {
    if (!supabaseClient) {
      renderLeaderboard();
      setBoardStatus("未连接", "error");
      return;
    }
    if (!quiet) setBoardStatus("同步中", "loading");
    const { data, error } = await supabaseClient.from("game_scores")
      .select("player_name,score,parts_used,energy_used,duration_ms,created_at")
      .eq("game_key", GAME_KEY)
      .eq("challenge_key", dateKey)
      .order("score", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(8);
    if (error) {
      console.error("Unable to load workshop leaderboard", error);
      renderLeaderboard();
      setBoardStatus("同步失败", "error");
      return;
    }
    renderLeaderboard(data || []);
    setBoardStatus("云端", "ready");
  };

  board.addEventListener("click", (event) => {
    const cell = event.target.closest(".workshop-cell");
    if (!cell || cell.disabled) return;
    const index = Number(cell.dataset.index);
    const piece = placements.get(index);
    if (piece && removeMode) {
      invalidateSolvedState();
      placements.delete(index);
      clearPower();
      renderBoard();
      setMessage(`${PARTS[piece.type].label}已拆回零件架。`);
      beep(180, 0.05, 0.015);
      return;
    }
    if (piece) {
      invalidateSolvedState();
      piece.rotation = (piece.rotation + 1) % 4;
      clearPower();
      renderBoard();
      setMessage(`${PARTS[piece.type].label}已旋转 90°。`);
      beep(330, 0.035, 0.012);
      return;
    }
    if (!removeMode && selectedPart) placePiece(index, selectedPart);
  });

  tray.addEventListener("click", (event) => {
    const button = event.target.closest("[data-part]");
    if (!button || button.disabled) return;
    selectedPart = button.dataset.part;
    removeMode = false;
    removeButton.classList.remove("is-active");
    renderTray();
    setMessage(`已选择${PARTS[selectedPart].label}，点击空格安装。`);
  });

  tray.addEventListener("dragstart", (event) => {
    const button = event.target.closest("[data-part]");
    if (!button || button.disabled) return;
    dragPayload = { type: button.dataset.part, sourceIndex: null };
    event.dataTransfer.effectAllowed = "copy";
  });

  board.addEventListener("dragstart", (event) => {
    const cell = event.target.closest(".workshop-cell");
    const index = Number(cell?.dataset.index);
    const piece = placements.get(index);
    if (!piece) return;
    dragPayload = { type: piece.type, sourceIndex: index };
    event.dataTransfer.effectAllowed = "move";
  });

  board.addEventListener("dragover", (event) => {
    const cell = event.target.closest(".workshop-cell");
    if (!cell || cell.disabled || pieceAt(Number(cell.dataset.index))) return;
    event.preventDefault();
    cell.classList.add("is-drop-target");
  });
  board.addEventListener("dragleave", (event) => event.target.closest(".workshop-cell")?.classList.remove("is-drop-target"));
  board.addEventListener("drop", (event) => {
    const cell = event.target.closest(".workshop-cell");
    board.querySelectorAll(".is-drop-target").forEach((item) => item.classList.remove("is-drop-target"));
    if (!cell || !dragPayload) return;
    event.preventDefault();
    placePiece(Number(cell.dataset.index), dragPayload.type, dragPayload.sourceIndex);
    dragPayload = null;
  });

  removeButton.addEventListener("click", () => {
    removeMode = !removeMode;
    removeButton.classList.toggle("is-active", removeMode);
    if (removeMode) setMessage("拆除模式：点击任意已放置零件将其收回。", "warning");
    else setMessage(`已选择${PARTS[selectedPart].label}，点击空格安装。`);
    renderTray();
  });
  resetButton.addEventListener("click", resetLevel);
  runButton.addEventListener("click", runMachine);
  resultClose.addEventListener("click", () => { resultPanel.hidden = true; });
  nextButton.addEventListener("click", () => {
    resultPanel.hidden = true;
    const order = ["core", "poro", "gate", "daily"];
    const next = activeKey === "daily" ? "daily" : order[(order.indexOf(activeKey) + 1) % order.length];
    selectLevel(next);
  });
  levelTabs.forEach((tab) => tab.addEventListener("click", () => selectLevel(tab.dataset.level)));

  scoreForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!lastResult || submitted || activeKey !== "daily" || !runId) return;
    const playerName = scoreInput.value.trim().slice(0, 12);
    const token = security?.token(turnstile);
    if (!playerName || !token) {
      setBoardStatus("请完成验证", "error");
      return;
    }
    scoreSubmit.disabled = true;
    scoreSubmit.textContent = "提交中";
    const solution = [...placements.entries()].map(([cell, piece]) => ({ cell, type: piece.type, rotation: piece.rotation }));
    try {
      await security.submit("workshop_score", {
        playerName,
        runId,
        challengeKey: dateKey,
        score: lastResult.score,
        durationMs: lastResult.durationMs,
        solution,
        turnstileToken: token,
      });
      localStorage.setItem(NAME_STORAGE, playerName);
      submitted = true;
      scoreForm.hidden = true;
      setBoardStatus("已登记", "ready");
      await loadLeaderboard(true);
    } catch (error) {
      console.error("Unable to submit workshop score", error);
      setBoardStatus(error.message || "提交失败", "error");
      security.reset(turnstile);
    } finally {
      scoreSubmit.disabled = false;
      scoreSubmit.textContent = "提交";
    }
  });

  window.setInterval(() => {
    if (!solvedAt) timeLabel.textContent = formatTime(elapsedMs());
  }, 500);
  window.setInterval(() => {
    if (!document.hidden) loadLeaderboard(true);
  }, 30000);

  dateElement.textContent = dateKey.replaceAll("-", ".");
  scoreInput.value = localStorage.getItem(NAME_STORAGE) || "";
  const completed = new Set(JSON.parse(localStorage.getItem(COMPLETE_STORAGE) || "[]"));
  levelTabs.forEach((tab) => tab.classList.toggle("is-complete", completed.has(tab.dataset.level)));
  renderBoard();
  loadLeaderboard();
})();
