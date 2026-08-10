---
hide:
  - navigation
  - toc
---

<section class="yuumi-game" id="yuumi-flight-game"
  data-sprite="../assets/images/game/yuumi-winter-spritesheet-v2.png"
  data-day-background="../assets/images/game/winter-day-background.png"
  data-night-background="../assets/images/game/winter-night-cave-background.png">
  <div class="yuumi-game__topline">
    <div>
      <p class="yuumi-game__eyebrow">PLAY / 冬境试炼</p>
      <h1>星林飞羽</h1>
    </div>
    <p class="yuumi-game__season"><span></span><strong id="game-theme-label">白昼 · 雪林</strong></p>
  </div>

  <div class="yuumi-game__layout">
    <div class="yuumi-game__stage-wrap">
      <div class="yuumi-game__hud" aria-live="polite">
        <span>本局 <strong id="game-distance">0 m</strong></span>
        <span>最佳 <strong id="game-best">0 m</strong></span>
        <button id="game-sound" type="button" aria-label="切换音效">音效 开</button>
        <button id="game-pause" type="button">暂停</button>
      </div>

      <div class="yuumi-game__canvas-shell">
        <canvas id="yuumi-game-canvas" width="960" height="540" tabindex="0" aria-label="悠米冬日飞行小游戏。按空格、点击或触摸控制悠米起飞。"></canvas>
        <div class="yuumi-game__curtain" id="game-curtain">
          <p class="yuumi-game__status" id="game-status">冰柱高低错落，找准节奏穿过去</p>
          <button class="yuumi-game__start" id="game-start" type="button">开始飞行</button>
          <small>空格 / 点击 / 触摸起飞</small>
        </div>
      </div>

      <p class="yuumi-game__hint">连续冰柱的通道会随机上下错开；按 <kbd>P</kbd> 暂停，按 <kbd>R</kbd> 重新开始。</p>
    </div>

    <aside class="yuumi-leaderboard" aria-labelledby="leaderboard-title">
      <div class="yuumi-leaderboard__head">
        <div>
          <p>GLOBAL RECORDS</p>
          <h2 id="leaderboard-title">里程英雄榜</h2>
        </div>
        <span id="game-board-status" data-tone="loading" aria-live="polite">连接中</span>
      </div>
      <ol id="game-leaderboard"></ol>
      <form class="yuumi-leaderboard__form" id="score-form" hidden>
        <label for="player-name">留下昵称</label>
        <div>
          <input id="player-name" name="name" maxlength="12" placeholder="旅人" autocomplete="nickname" required>
          <button type="submit">登记</button>
        </div>
        <div class="human-check human-check--score" data-score-turnstile aria-label="人机验证"></div>
      </form>
    </aside>
  </div>
</section>
