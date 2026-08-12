---
hide:
  - navigation
  - toc
---

<section class="daily-space" id="daily-space" data-source="qzone.json" data-photo-manifest="photo-manifest.json">
  <header class="daily-space__hero">
    <div>
      <p class="daily-space__eyebrow">DAILY / PERSONAL SPACE</p>
      <h1>日常</h1>
      <p>照片、说说与生活片段，从 2025 年 8 月 15 日开始记录。</p>
    </div>
    <div class="daily-space__hero-actions">
      <button class="daily-owner-only daily-space__edit" id="daily-owner-edit" type="button" hidden>
        <span aria-hidden="true">✦</span> 编辑日常 <small>仅本机</small>
      </button>
    </div>
  </header>

  <div class="daily-space__stats" aria-label="日常统计">
    <span><strong id="daily-post-count">0</strong> 条记录</span>
    <span><strong id="daily-photo-count">0</strong> 张照片</span>
    <span>2025-08-15 至今</span>
  </div>

  <div class="daily-space__notice" id="daily-space-notice" role="status">正在读取日常记录…</div>
  <div class="daily-timeline" id="daily-timeline"></div>
  <div class="daily-load-more" id="daily-load-more" hidden>
    <button id="daily-load-more-button" type="button">
      <span>加载更多</span>
      <small id="daily-load-more-status" aria-live="polite"></small>
    </button>
  </div>

  <aside class="daily-editor" id="daily-editor" aria-labelledby="daily-editor-title" hidden>
    <div class="daily-editor__backdrop" data-editor-close></div>
    <section class="daily-editor__panel">
      <header>
        <div>
          <p>OWNER MODE / LOCALHOST</p>
          <h2 id="daily-editor-title">编辑日常</h2>
        </div>
        <button type="button" data-editor-close aria-label="关闭编辑器">×</button>
      </header>

      <div class="daily-editor__permission">
        <p>编辑只在本机显示。首次保存时请选择 <code>docs/daily/qzone.json</code>，浏览器会单独请求文件写入权限。</p>
        <button id="daily-editor-file" type="button">选择数据文件</button>
        <span id="daily-editor-file-status">尚未授权</span>
      </div>

      <label class="daily-editor__select-label" for="daily-editor-select">选择记录</label>
      <select id="daily-editor-select"></select>

      <form id="daily-editor-form">
        <input id="daily-editor-id" type="hidden">
        <label>类型
          <select id="daily-editor-type">
            <option value="说说">说说</option>
            <option value="相册">相册</option>
            <option value="日常">日常</option>
          </select>
        </label>
        <label>日期与时间
          <input id="daily-editor-date" type="datetime-local" required>
        </label>
        <label>文字
          <textarea id="daily-editor-content" rows="6" placeholder="记录今天发生的事…"></textarea>
        </label>
        <label>图片地址 <small>每行一张，可填写本地相对路径或网络地址</small>
          <textarea id="daily-editor-images" rows="5" placeholder="../assets/images/daily/example.jpg"></textarea>
        </label>
        <div class="daily-editor__buttons">
          <button id="daily-editor-new" type="button">新增</button>
          <button id="daily-editor-delete" class="danger" type="button">删除</button>
          <button type="submit">保存修改</button>
        </div>
      </form>
    </section>
  </aside>
</section>
