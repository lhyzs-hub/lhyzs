---
title: 海克斯机巧工坊
hide:
  - navigation
  - toc
---

<section class="hex-workshop" id="hex-workshop">
  <nav class="play-mode-nav" aria-label="选择游戏">
    <a href="../"><span>01</span>星林飞羽</a>
    <a class="is-active" href="./" aria-current="page"><span>02</span>海克斯机巧工坊</a>
  </nav>

  <header class="hex-workshop__header">
    <div>
      <p>PLAY / HEXTECH MECHANICS LAB</p>
      <h1>海克斯机巧工坊</h1>
      <span>连接传动链，让每一份能量都抵达正确的位置。</span>
    </div>
    <div class="hex-workshop__daily-stamp">
      <small>DAILY BLUEPRINT</small>
      <strong id="workshop-date">----</strong>
    </div>
  </header>

  <div class="hex-workshop__level-tabs" role="tablist" aria-label="工坊关卡">
    <button type="button" role="tab" data-level="core" aria-selected="true"><i>01</i><span>核心点火</span></button>
    <button type="button" role="tab" data-level="poro"><i>02</i><span>魄罗输运</span></button>
    <button type="button" role="tab" data-level="gate"><i>03</i><span>双路机关</span></button>
    <button type="button" role="tab" data-level="daily"><i>◆</i><span>每日蓝图</span></button>
  </div>

  <div class="hex-workshop__layout">
    <main class="workbench" aria-labelledby="workshop-level-title">
      <div class="workbench__brief">
        <div>
          <p id="workshop-level-code">BLUEPRINT 01</p>
          <h2 id="workshop-level-title">核心点火</h2>
          <span id="workshop-objective">绕开损坏区域，将电机动力传至海克斯核心。</span>
        </div>
        <div class="workbench__meters" aria-live="polite">
          <span>零件<strong id="workshop-parts">0</strong></span>
          <span>能耗<strong id="workshop-energy">0</strong></span>
          <span>用时<strong id="workshop-time">00:00</strong></span>
        </div>
      </div>

      <div class="workbench__board-frame">
        <div class="workbench__rail workbench__rail--top" aria-hidden="true"></div>
        <div class="workbench__board" id="workshop-board" role="grid" aria-label="机械拼装网格"></div>
        <div class="workbench__scan" aria-hidden="true"></div>
      </div>

      <div class="workbench__tray" aria-label="可用零件">
        <div class="workbench__tray-title"><span>COMPONENT RACK</span><small>拖动，或先选中再点击格子</small></div>
        <div class="workbench__parts" id="workshop-tray"></div>
      </div>

      <div class="workbench__controls">
        <p id="workshop-message" data-tone="idle" aria-live="polite">选择零件并铺设传动路径；点击已放置的零件可旋转。</p>
        <div>
          <button class="workshop-button workshop-button--quiet" id="workshop-remove" type="button">拆除</button>
          <button class="workshop-button workshop-button--quiet" id="workshop-reset" type="button">重置蓝图</button>
          <button class="workshop-button workshop-button--run" id="workshop-run" type="button"><i aria-hidden="true"></i>启动装置</button>
        </div>
      </div>

      <section class="workshop-result" id="workshop-result" hidden aria-labelledby="workshop-result-title">
        <div class="workshop-result__stars" id="workshop-stars" aria-label="关卡评分"></div>
        <p>ASSEMBLY COMPLETE</p>
        <h2 id="workshop-result-title">装置运转成功</h2>
        <div class="workshop-result__score"><span>方案评分</span><strong id="workshop-score">0000</strong></div>
        <div class="workshop-result__actions">
          <button type="button" id="workshop-result-close">继续调试</button>
          <button type="button" id="workshop-next">下一蓝图</button>
        </div>
      </section>
    </main>

    <aside class="workshop-board-panel" aria-labelledby="workshop-board-title">
      <div class="workshop-board-panel__head">
        <div><p>DAILY OPTIMAL</p><h2 id="workshop-board-title">今日最优方案</h2></div>
        <span id="workshop-board-status" data-tone="loading">连接中</span>
      </div>
      <div class="workshop-board-panel__rule"><i></i><span>评分综合零件数、完成时间与能耗</span></div>
      <ol id="workshop-leaderboard"></ol>
      <form class="workshop-score-form" id="workshop-score-form" hidden>
        <label for="workshop-player-name">登记今日方案</label>
        <div>
          <input id="workshop-player-name" name="name" maxlength="12" placeholder="机械师" autocomplete="nickname" required>
          <button type="submit">提交</button>
        </div>
        <div class="human-check" data-workshop-turnstile aria-label="人机验证"></div>
      </form>
      <div class="workshop-board-panel__note">
        <strong>工程师提示</strong>
        <p>齿轮可向四周传动；皮带能耗更低。蓝色高亮表示动力已经通过。</p>
        <a href="../../notes/工科学习/" aria-label="前往工科学习笔记">查看工科学习笔记 <span>↗</span></a>
      </div>
    </aside>
  </div>
</section>
