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

  <dialog class="daily-gallery" id="daily-gallery" aria-label="照片预览">
    <header class="daily-gallery__header">
      <p id="daily-gallery-caption"></p>
      <button type="button" data-gallery-close aria-label="关闭照片预览">关闭 <span aria-hidden="true">×</span></button>
    </header>
    <div class="daily-gallery__stage">
      <img id="daily-gallery-image" alt="">
      <p id="daily-gallery-status" role="status"></p>
      <button type="button" data-gallery-retry hidden>重新加载</button>
    </div>
    <nav class="daily-gallery__nav" aria-label="切换照片">
      <button type="button" data-gallery-prev aria-label="上一张照片">← 上一张</button>
      <span id="daily-gallery-count" aria-live="polite"></span>
      <button type="button" data-gallery-next aria-label="下一张照片">下一张 →</button>
    </nav>
  </dialog>

  <aside class="daily-editor" id="daily-editor" aria-labelledby="daily-editor-title" hidden>
    <div class="daily-editor__backdrop" data-editor-close></div>
    <section class="daily-editor__panel">
      <header>
        <div>
          <p>OWNER MODE / LOCALHOST</p>
          <h2 id="daily-editor-title">发布日常</h2>
        </div>
        <button type="button" data-editor-close aria-label="关闭编辑器">×</button>
      </header>

      <div class="daily-editor__permission">
        <p>连接一次 <code>docs</code> 文件夹后，文字和图片会直接写入站点。仅在本机显示。</p>
        <button id="daily-editor-folder" type="button">连接 docs 文件夹</button>
        <span id="daily-editor-file-status">尚未连接</span>
      </div>

      <div class="daily-editor__mode">
        <button id="daily-editor-new" type="button">发一条新的日常</button>
        <label for="daily-editor-select">编辑已有</label>
        <select id="daily-editor-select"></select>
      </div>

      <form id="daily-editor-form">
        <input id="daily-editor-id" type="hidden">
        <input id="daily-editor-type" type="hidden" value="日常">

        <label class="daily-editor__compose-label" for="daily-editor-content">此刻想记录什么？</label>
        <textarea id="daily-editor-content" rows="4" placeholder="文字、心情、地点……"></textarea>

        <div class="daily-editor__dropzone" id="daily-editor-dropzone" role="button" tabindex="0" aria-label="粘贴、拖入或点击添加图片">
          <strong>粘贴、拖入或点击添加图片</strong>
          <span>支持剪贴板截图，发布时自动压缩并生成缩略图</span>
          <input id="daily-editor-image-input" class="daily-editor__file-input" type="file" accept="image/*" multiple>
        </div>
        <div class="daily-editor__image-list" id="daily-editor-image-list" aria-live="polite"></div>

        <details class="daily-editor__advanced">
          <summary>
            <span id="daily-editor-time-summary">发布时间：现在（自动）</span>
            <span class="daily-editor__advanced-hint" aria-hidden="true">修改</span>
          </summary>
          <label>自定义时间
            <input id="daily-editor-date" type="datetime-local">
            <small>留空就使用点击“发布”时的时间</small>
          </label>
          <label>类型
            <select id="daily-editor-type-select">
              <option value="日常">日常</option>
              <option value="说说">说说</option>
              <option value="相册">相册</option>
            </select>
          </label>
        </details>

        <p class="daily-editor__status" id="daily-editor-status" role="status"></p>
        <div class="daily-editor__buttons">
          <button id="daily-editor-delete" class="danger" type="button" hidden>删除这条</button>
          <button type="submit" id="daily-editor-submit">发布</button>
        </div>
      </form>
    </section>
  </aside>
</section>
