---
hide:
  - navigation
  - toc
---

<main class="comment-admin" id="comment-admin" data-admin-email="3178287074@qq.com">
  <header class="comment-admin__hero">
    <div>
      <p>OWNER CONSOLE / COMMENT SIGNAL</p>
      <h1>评论通知</h1>
      <span>集中查看笔记与日常收到的留言。</span>
    </div>
    <div class="comment-admin__identity" id="comment-admin-identity" hidden>
      <span>ADMIN</span>
      <strong>3178287074@qq.com</strong>
      <button id="comment-admin-sign-out" type="button">退出</button>
    </div>
  </header>

  <section class="comment-admin-login" id="comment-admin-login" aria-labelledby="comment-admin-login-title">
    <div class="comment-admin-login__mark" aria-hidden="true"><i></i><i></i><i></i></div>
    <p>PRIVATE CHANNEL / 仅站长可见</p>
    <h2 id="comment-admin-login-title">验证管理员邮箱</h2>
    <span>验证码将发送至 3178287074@qq.com，仅用于本次登录。</span>
    <button id="comment-admin-send-code" type="button">发送 8 位验证码</button>
    <form class="comment-admin-login__verify" id="comment-admin-code-form" hidden>
      <label for="comment-admin-code">邮箱验证码</label>
      <div>
        <input
          id="comment-admin-code"
          name="code"
          type="text"
          inputmode="numeric"
          autocomplete="one-time-code"
          pattern="[0-9]{8}"
          minlength="8"
          maxlength="8"
          placeholder="输入 8 位数字"
          aria-describedby="comment-admin-login-status"
          required
        >
        <button id="comment-admin-verify-code" type="submit">验证并登录</button>
      </div>
    </form>
    <small id="comment-admin-login-status" role="status" aria-live="polite"></small>
  </section>

  <section class="comment-admin-console" id="comment-admin-console" hidden>
    <div class="comment-admin__stats" aria-label="评论统计">
      <article><span>全部评论</span><strong id="comment-admin-total">0</strong></article>
      <article><span>未读通知</span><strong id="comment-admin-unread">0</strong></article>
      <article><span>公开显示</span><strong id="comment-admin-visible">0</strong></article>
      <article><span>已隐藏</span><strong id="comment-admin-hidden">0</strong></article>
    </div>

    <div class="comment-admin__toolbar">
      <div class="comment-admin__filters" role="group" aria-label="筛选评论">
        <button type="button" data-comment-filter="all" aria-pressed="true">全部</button>
        <button type="button" data-comment-filter="unread" aria-pressed="false">未读</button>
        <button type="button" data-comment-filter="visible" aria-pressed="false">公开</button>
        <button type="button" data-comment-filter="hidden" aria-pressed="false">已隐藏</button>
      </div>
      <label class="comment-admin__search">
        <span class="sr-only">搜索评论</span>
        <input id="comment-admin-search" type="search" placeholder="搜索昵称、内容或页面" autocomplete="off">
      </label>
      <button class="comment-admin__read-all" id="comment-admin-read-all" type="button">全部标为已读</button>
    </div>

    <p class="comment-admin__status" id="comment-admin-status" role="status" aria-live="polite">正在同步评论…</p>
    <div class="comment-admin__list" id="comment-admin-list"></div>
  </section>
</main>
