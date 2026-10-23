/* Loaded when a visitor opens a photo, keeping the daily timeline lightweight. */
let instance;

export function openGallery({ root, photos, index, caption, opener }) {
  const dialog = root.querySelector("#daily-gallery");
  if (!instance || instance.dialog !== dialog) instance = createGallery(dialog);
  instance.open({ photos, index, caption, opener });
}

function createGallery(dialog) {
  const image = dialog.querySelector("#daily-gallery-image");
  const caption = dialog.querySelector("#daily-gallery-caption");
  const count = dialog.querySelector("#daily-gallery-count");
  const status = dialog.querySelector("#daily-gallery-status");
  const retry = dialog.querySelector("[data-gallery-retry]");
  const previous = dialog.querySelector("[data-gallery-prev]");
  const next = dialog.querySelector("[data-gallery-next]");
  const close = dialog.querySelector("[data-gallery-close]");
  let photos = [];
  let index = 0;
  let opener;

  const show = () => {
    status.textContent = "正在加载高清照片…";
    status.hidden = false;
    if (document.activeElement === retry) close.focus();
    retry.hidden = true;
    image.hidden = true;
    count.textContent = `${index + 1} / ${photos.length}`;
    previous.disabled = index === 0;
    next.disabled = index === photos.length - 1;
    image.alt = `${caption.textContent}，第 ${index + 1} 张照片`;
    image.src = photos[index];
  };

  const move = (direction) => {
    const target = index + direction;
    if (target < 0 || target >= photos.length) return;
    index = target;
    show();
  };

  image.addEventListener("load", () => {
    image.hidden = false;
    status.hidden = true;
    retry.hidden = true;
  });
  image.addEventListener("error", () => {
    if (!dialog.open) return;
    image.hidden = true;
    status.hidden = false;
    status.textContent = "照片暂时无法加载，请联网后重试。";
    retry.hidden = false;
  });
  close.addEventListener("click", () => dialog.close());
  previous.addEventListener("click", () => move(-1));
  next.addEventListener("click", () => move(1));
  retry.addEventListener("click", show);
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "Tab") {
      const controls = [...dialog.querySelectorAll("button:not([disabled]):not([hidden])")];
      const target = event.shiftKey ? controls[controls.length - 1] : controls[0];
      const boundary = event.shiftKey ? controls[0] : controls[controls.length - 1];
      if (document.activeElement === boundary) {
        event.preventDefault();
        target.focus();
      }
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      move(event.key === "ArrowLeft" ? -1 : 1);
    }
  });
  dialog.addEventListener("close", () => {
    document.body.classList.remove("daily-gallery-open");
    image.removeAttribute("src");
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  });
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  return {
    dialog,
    open(settings) {
      ({ photos, index, opener } = settings);
      caption.textContent = settings.caption;
      if (!dialog.open) dialog.showModal();
      document.body.classList.add("daily-gallery-open");
      show();
    },
  };
}
