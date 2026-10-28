const editorCss = new URL("../stylesheets/daily-editor.css", import.meta.url).href;
if (!document.querySelector("link[data-daily-editor-css]")) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = editorCss;
  link.dataset.dailyEditorCss = "";
  document.head.append(link);
}

const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
})[char]);

const dateLabel = (value) => new Intl.DateTimeFormat("zh-CN", {
  year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
}).format(new Date(value));

export const initDailyEditor = ({
  root,
  timeline,
  ownerButton,
  render,
  getPayload,
  setPayload,
  getPhotoManifest,
  setPhotoManifest
}) => {
  const editor = root.querySelector("#daily-editor");
  const form = root.querySelector("#daily-editor-form");
  const select = root.querySelector("#daily-editor-select");
  const folderButton = root.querySelector("#daily-editor-folder");
  const fileStatus = root.querySelector("#daily-editor-file-status");
  const dropzone = root.querySelector("#daily-editor-dropzone");
  const imageInput = root.querySelector("#daily-editor-image-input");
  const imageList = root.querySelector("#daily-editor-image-list");
  const timeSummary = root.querySelector("#daily-editor-time-summary");
  const editorStatus = root.querySelector("#daily-editor-status");
  const editorTitle = root.querySelector("#daily-editor-title");
  const deleteButton = root.querySelector("#daily-editor-delete");
  const submitButton = root.querySelector("#daily-editor-submit");
  const fields = {
    id: root.querySelector("#daily-editor-id"),
    type: root.querySelector("#daily-editor-type"),
    typeSelect: root.querySelector("#daily-editor-type-select"),
    date: root.querySelector("#daily-editor-date"),
    content: root.querySelector("#daily-editor-content")
  };

  let payload = getPayload();
  let photoManifest = getPhotoManifest();
  let docsHandle = null;
  let rememberedHandle = null;
  let pendingImages = [];
  let imageSequence = 0;
  let saving = false;

  const renderEntryOptions = () => {
    const entries = [...payload.entries].sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
    select.innerHTML = `<option value="">选择一条记录…</option>${entries.map((entry) => `
      <option value="${escapeHtml(entry.id)}">${escapeHtml(dateLabel(entry.date))} · ${escapeHtml(entry.content || entry.type || "日常")}</option>
    `).join("")}`;
    select.value = entries.some((entry) => entry.id === fields.id.value) ? fields.id.value : "";
  };

  const sync = () => {
    setPayload(payload);
    setPhotoManifest(photoManifest);
    renderEntryOptions();
  };

  const localDayKey = (value) => {
    const date = new Date(value);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  const localInputValue = (value = new Date()) => {
    const date = new Date(value);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
  };

  const setStatus = (message, tone = "") => {
    editorStatus.textContent = message;
    if (tone) editorStatus.dataset.tone = tone;
    else delete editorStatus.dataset.tone;
  };

  const DB_NAME = "lhyzs-daily-editor";
  const STORE_NAME = "handles";
  const DOCS_HANDLE_KEY = "docs";

  const readStoredHandle = () => new Promise((resolve) => {
    if (!("indexedDB" in window)) return resolve(null);
    try {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
      };
      request.onerror = () => resolve(null);
      request.onsuccess = () => {
        const db = request.result;
        try {
          const get = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(DOCS_HANDLE_KEY);
          get.onsuccess = () => resolve(get.result || null);
          get.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      };
    } catch {
      resolve(null);
    }
  });

  const storeHandle = (handle) => new Promise((resolve) => {
    if (!("indexedDB" in window)) return resolve(false);
    try {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
      };
      request.onerror = () => resolve(false);
      request.onsuccess = () => {
        const db = request.result;
        try {
          const transaction = db.transaction(STORE_NAME, "readwrite");
          transaction.objectStore(STORE_NAME).put(handle, DOCS_HANDLE_KEY);
          transaction.oncomplete = () => resolve(true);
          transaction.onerror = () => resolve(false);
        } catch {
          resolve(false);
        }
      };
    } catch {
      resolve(false);
    }
  });

  const hasDailyData = async (candidate) => {
    try {
      const daily = await candidate.getDirectoryHandle("daily");
      await daily.getFileHandle("qzone.json");
      return true;
    } catch {
      return false;
    }
  };

  const resolveDocsDirectory = async (candidate) => {
    if (await hasDailyData(candidate)) return candidate;
    try {
      const nested = await candidate.getDirectoryHandle("docs");
      if (await hasDailyData(nested)) return nested;
    } catch {
      // The selected folder is not the repository root.
    }
    throw new Error("请选择项目里的 docs 文件夹（或项目根目录）。");
  };

  const getDirectoryPath = async (rootDirectory, parts, create = false) => {
    let directory = rootDirectory;
    for (const part of parts) directory = await directory.getDirectoryHandle(part, { create });
    return directory;
  };

  const readJsonFile = async (directory, name) => {
    const handle = await directory.getFileHandle(name);
    return JSON.parse(await (await handle.getFile()).text());
  };

  const readJsonFileOr = async (directory, name, fallback) => {
    try {
      return await readJsonFile(directory, name);
    } catch {
      return fallback;
    }
  };

  const writeBlob = async (directory, name, blob) => {
    const handle = await directory.getFileHandle(name, { create: true });
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
  };

  const writeJsonFile = (directory, name, value) => writeBlob(
    directory,
    name,
    new Blob([JSON.stringify(value, null, 2) + "\n"], { type: "application/json" })
  );

  const fileExists = async (directory, name) => {
    try {
      await directory.getFileHandle(name);
      return true;
    } catch {
      return false;
    }
  };

  const bitmapFor = async (file) => {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      return createImageBitmap(file);
    }
  };

  const renderBitmap = (bitmap, maxEdge, quality) => new Promise((resolve, reject) => {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return reject(new Error("浏览器无法创建图片画布。"));
    context.drawImage(bitmap, 0, 0, width, height);
    canvas.toBlob((blob) => {
      if (blob) resolve({ blob, width, height });
      else reject(new Error("浏览器无法压缩这张图片。"));
    }, "image/webp", quality);
  });

  const prepareImage = async (file) => {
    const bitmap = await bitmapFor(file);
    try {
      const thumbnail = await renderBitmap(bitmap, 720, 0.76);
      const original = await renderBitmap(bitmap, 2400, 0.86);
      return {
        blob: original.blob,
        width: original.width,
        height: original.height,
        thumbBlob: thumbnail.blob,
        thumbWidth: thumbnail.width,
        thumbHeight: thumbnail.height
      };
    } finally {
      bitmap.close?.();
    }
  };

  const updateTimeSummary = () => {
    if (!fields.date.value) {
      timeSummary.textContent = "发布时间：现在（发布时自动生成）";
      return;
    }
    const date = new Date(fields.date.value);
    timeSummary.textContent = `发布时间：${Number.isNaN(date.getTime()) ? "时间无效" : dateLabel(date)}`;
  };

  const imageStatusLabel = (item) => {
    if (item.kind === "existing") return "已发布";
    if (item.status === "processing") return "处理中…";
    if (item.status === "error") return "无法读取";
    return "待发布";
  };

  const renderImageList = () => {
    imageList.innerHTML = pendingImages.map((item) => `
      <figure class="daily-editor__image">
        <img src="${escapeHtml(item.previewUrl || "")}" alt="">
        <figcaption>${escapeHtml(imageStatusLabel(item))}</figcaption>
        <button type="button" data-remove-image="${escapeHtml(item.key)}" aria-label="移除图片">×</button>
      </figure>`).join("");
  };

  const removeImage = (key) => {
    const index = pendingImages.findIndex((item) => item.key === key);
    if (index < 0) return;
    const [item] = pendingImages.splice(index, 1);
    if (item.kind === "new" && item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    renderImageList();
  };

  const isImageFile = (file) => Boolean(file) && (
    String(file.type || "").startsWith("image/") ||
    /\.(avif|bmp|gif|jpe?g|png|webp)$/i.test(file.name || "")
  );

  const addImageFiles = async (fileList) => {
    const files = [...fileList].filter(isImageFile);
    if (!files.length) {
      setStatus("没有识别到图片。", "error");
      return;
    }
    const items = files.map((file) => ({
      key: `new-${Date.now()}-${++imageSequence}`,
      kind: "new",
      name: file.name || "粘贴的图片",
      blob: file,
      previewUrl: URL.createObjectURL(file),
      status: "processing"
    }));
    pendingImages.push(...items);
    renderImageList();
    setStatus(`正在处理 ${items.length} 张图片…`);

    for (const item of items) {
      try {
        const prepared = await prepareImage(item.blob);
        if (!pendingImages.includes(item)) continue;
        const previewUrl = URL.createObjectURL(prepared.thumbBlob);
        const previousPreview = item.previewUrl;
        Object.assign(item, prepared, { status: "ready", previewUrl });
        URL.revokeObjectURL(previousPreview);
      } catch {
        item.status = "error";
      }
      renderImageList();
    }

    const failed = items.filter((item) => item.status === "error").length;
    if (failed) setStatus(`${failed} 张图片无法读取，请移除后重试。`, "error");
    else setStatus(`已添加 ${items.length} 张图片。`, "success");
  };

  const setEntryImages = (images = []) => {
    for (const item of pendingImages) {
      if (item.kind === "new" && item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    }
    pendingImages = images.filter(Boolean).map((src, index) => ({
      key: `existing-${index}`,
      kind: "existing",
      src,
      previewUrl: photoManifest[src]?.thumbnail || src
    }));
    renderImageList();
  };

  const clearPendingImages = () => {
    for (const item of pendingImages) {
      if (item.kind === "new" && item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    }
    pendingImages = [];
    renderImageList();
  };

  const clearForm = () => {
    renderEntryOptions();
    fields.id.value = `daily-${Date.now()}`;
    fields.type.value = "日常";
    fields.typeSelect.value = "日常";
    fields.date.value = "";
    fields.content.value = "";
    select.value = "";
    deleteButton.hidden = true;
    editorTitle.textContent = "发布日常";
    submitButton.textContent = "发布";
    clearPendingImages();
    updateTimeSummary();
    setStatus("");
  };

  const loadEntry = (id) => {
    const entry = payload.entries.find((item) => item.id === id);
    if (!entry) return clearForm();
    const type = ["日常", "说说", "相册"].includes(entry.type) ? entry.type : "日常";
    fields.id.value = entry.id;
    fields.type.value = entry.type || type;
    fields.typeSelect.value = type;
    fields.date.value = localInputValue(new Date(entry.date));
    fields.content.value = entry.content || "";
    select.value = entry.id;
    deleteButton.hidden = false;
    editorTitle.textContent = "编辑日常";
    submitButton.textContent = "保存修改";
    setEntryImages(entry.images);
    updateTimeSummary();
    setStatus("正在编辑这条日常。");
  };

  const connectFolder = async (handle = null, options = {}) => {
    if (typeof window.showDirectoryPicker !== "function") {
      setStatus("当前浏览器不支持直接写入，请用 Edge 或 Chrome 打开本机预览。", "error");
      return false;
    }
    try {
      const fromPicker = !handle;
      if (!handle) handle = await window.showDirectoryPicker({ id: "lhyzs-docs", mode: "readwrite" });
      if (!fromPicker && typeof handle.queryPermission === "function") {
        const permission = await handle.queryPermission({ mode: "readwrite" });
        if (permission !== "granted") {
          const requested = await handle.requestPermission({ mode: "readwrite" });
          if (requested !== "granted") throw new Error("没有获得文件夹写入权限。");
        }
      }
      const resolved = await resolveDocsDirectory(handle);
      const dailyDirectory = await resolved.getDirectoryHandle("daily");
      const nextPayload = await readJsonFile(dailyDirectory, "qzone.json");
      if (!Array.isArray(nextPayload.entries)) throw new Error("qzone.json 的 entries 格式不正确。");
      docsHandle = resolved;
      rememberedHandle = resolved;
      payload = nextPayload;
      photoManifest = await readJsonFileOr(dailyDirectory, "photo-manifest.json", {});
      sync();
      await storeHandle(resolved);
      fileStatus.textContent = "已连接 docs";
      folderButton.textContent = "重新选择文件夹";
      render();
      if (!options.silent) setStatus("文件夹已连接，可以发布。", "success");
      return true;
    } catch (error) {
      if (error?.name === "AbortError") {
        fileStatus.textContent = "未选择文件夹";
        return false;
      }
      fileStatus.textContent = "连接失败";
      setStatus(error?.message || "无法连接 docs 文件夹。", "error");
      return false;
    }
  };

  const restoreFolder = async () => {
    if (typeof window.showDirectoryPicker !== "function") return false;
    const stored = await readStoredHandle();
    if (!stored) return false;
    rememberedHandle = stored;
    const permission = typeof stored.queryPermission === "function"
      ? await stored.queryPermission({ mode: "readwrite" })
      : "prompt";
    if (permission === "granted") return connectFolder(stored, { silent: true });
    fileStatus.textContent = "已记住文件夹，点击连接";
    return false;
  };

  const saveEntry = async () => {
    if (saving) return;
    const date = fields.date.value ? new Date(fields.date.value) : new Date();
    if (Number.isNaN(date.getTime())) {
      setStatus("发布时间无效。", "error");
      return;
    }
    const content = fields.content.value.trim();
    if (!content && !pendingImages.length) {
      setStatus("写点文字或加一张图片再发布。", "error");
      fields.content.focus();
      return;
    }
    if (pendingImages.some((item) => item.status === "processing")) {
      setStatus("图片还在处理中，请稍候。", "error");
      return;
    }
    if (pendingImages.some((item) => item.status === "error")) {
      setStatus("有图片无法读取，请移除后重试。", "error");
      return;
    }
    if (!docsHandle && !(await connectFolder())) return;

    saving = true;
    submitButton.disabled = true;
    submitButton.textContent = "正在发布…";
    setStatus("正在写入站点…");
    try {
      const dailyDirectory = await docsHandle.getDirectoryHandle("daily");
      const timestamp = Math.floor(date.getTime() / 1000);
      const day = localDayKey(date);
      const mediaDirectory = await getDirectoryPath(docsHandle, ["assets", "images", "daily", "qzone", day], true);
      const thumbnailDirectory = await getDirectoryPath(docsHandle, ["assets", "images", "daily", "thumbs", "qzone", day], true);
      const imageUrls = [];

      for (const item of pendingImages) {
        if (item.kind === "existing") {
          imageUrls.push(item.src);
          continue;
        }
        let sequence = 1;
        let name = "";
        do {
          name = `${timestamp}-${String(sequence).padStart(2, "0")}.webp`;
          sequence += 1;
        } while (await fileExists(mediaDirectory, name));
        await writeBlob(mediaDirectory, name, item.blob);
        await writeBlob(thumbnailDirectory, name, item.thumbBlob);
        const src = `../assets/images/daily/qzone/${day}/${name}`;
        photoManifest[src] = {
          thumbnail: `../assets/images/daily/thumbs/qzone/${day}/${name}`,
          width: item.width,
          height: item.height,
          thumbnail_width: item.thumbWidth,
          thumbnail_height: item.thumbHeight
        };
        imageUrls.push(src);
      }

      const entry = {
        id: fields.id.value || `daily-${Date.now()}`,
        type: fields.type.value || "日常",
        timestamp,
        date: date.toISOString(),
        content,
        images: imageUrls,
        source: payload.entries.find((item) => item.id === fields.id.value)?.source || "本机编辑"
      };
      const edited = payload.entries.some((item) => item.id === entry.id);
      const index = payload.entries.findIndex((item) => item.id === entry.id);
      if (index >= 0) payload.entries[index] = entry;
      else payload.entries.push(entry);
      payload.generated_at = new Date().toISOString();
      await writeJsonFile(dailyDirectory, "photo-manifest.json", photoManifest);
      await writeJsonFile(dailyDirectory, "qzone.json", payload);

      sync();
      render();
      clearForm();
      fileStatus.textContent = "已保存到 docs";
      setStatus(edited ? "已保存修改。" : "已发布。", "success");
    } catch (error) {
      setStatus(error?.message || "发布失败，请重试。", "error");
    } finally {
      saving = false;
      submitButton.disabled = false;
      submitButton.textContent = payload.entries.some((entry) => entry.id === fields.id.value) ? "保存修改" : "发布";
    }
  };

  const removeEntry = async () => {
    const id = fields.id.value;
    if (!payload.entries.some((entry) => entry.id === id)) return;
    if (!confirm("确定删除这条日常记录吗？")) return;
    if (!docsHandle && !(await connectFolder())) return;
    if (!payload.entries.some((entry) => entry.id === id)) {
      setStatus("这条记录已经不存在。", "error");
      return;
    }
    saving = true;
    deleteButton.disabled = true;
    setStatus("正在删除…");
    try {
      const dailyDirectory = await docsHandle.getDirectoryHandle("daily");
      payload.entries = payload.entries.filter((entry) => entry.id !== id);
      payload.generated_at = new Date().toISOString();
      await writeJsonFile(dailyDirectory, "qzone.json", payload);
      sync();
      render();
      clearForm();
      fileStatus.textContent = "已保存到 docs";
      setStatus("已删除这条日常。", "success");
    } catch (error) {
      setStatus(error?.message || "删除失败，请重试。", "error");
    } finally {
      saving = false;
      deleteButton.disabled = false;
    }
  };

  const openEditor = (id = "") => {
    if (id) loadEntry(id);
    editor.hidden = false;
    document.body.classList.add("daily-editor-open");
    const panel = editor.querySelector(".daily-editor__panel");
    window.requestAnimationFrame(() => {
      fields.content.focus({ preventScroll: true });
      if (panel) panel.scrollTop = 0;
    });
  };

  ownerButton.addEventListener("click", () => {
    clearForm();
    openEditor();
  });
  timeline.addEventListener("click", (event) => {
    const edit = event.target.closest("[data-edit-entry]");
    if (edit) openEditor(edit.dataset.editEntry);
  });
  editor.querySelectorAll("[data-editor-close]").forEach((button) => button.addEventListener("click", () => {
    editor.hidden = true;
    document.body.classList.remove("daily-editor-open");
  }));
  editor.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    editor.hidden = true;
    document.body.classList.remove("daily-editor-open");
    ownerButton.focus();
  });
  select.addEventListener("change", () => loadEntry(select.value));
  root.querySelector("#daily-editor-new").addEventListener("click", () => {
    clearForm();
    openEditor();
  });
  deleteButton.addEventListener("click", removeEntry);
  folderButton.addEventListener("click", () => connectFolder(rememberedHandle));
  fields.date.addEventListener("input", updateTimeSummary);
  fields.typeSelect.addEventListener("change", () => {
    fields.type.value = fields.typeSelect.value;
  });
  dropzone.addEventListener("click", (event) => {
    if (event.target !== imageInput) imageInput.click();
  });
  dropzone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      imageInput.click();
    }
  });
  imageInput.addEventListener("change", () => {
    void addImageFiles(imageInput.files);
    imageInput.value = "";
  });
  imageList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-image]");
    if (button) removeImage(button.dataset.removeImage);
  });
  form.addEventListener("dragover", (event) => {
    if (![...(event.dataTransfer?.types || [])].includes("Files")) return;
    event.preventDefault();
    dropzone.classList.add("is-dragging");
  });
  form.addEventListener("dragleave", (event) => {
    if (!form.contains(event.relatedTarget)) dropzone.classList.remove("is-dragging");
  });
  form.addEventListener("drop", (event) => {
    event.preventDefault();
    dropzone.classList.remove("is-dragging");
    void addImageFiles(event.dataTransfer?.files || []);
  });
  editor.addEventListener("paste", (event) => {
    const files = [...(event.clipboardData?.items || [])]
      .filter((item) => item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter(Boolean);
    if (!files.length) return;
    event.preventDefault();
    void addImageFiles(files);
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void saveEntry();
  });
  fields.content.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  clearForm();
  restoreFolder().catch(() => {});
};
