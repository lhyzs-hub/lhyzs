(() => {
  const init = () => {
    const page = document.querySelector("[data-notes-hub]");
    if (!page || page.dataset.ready === "true") return;
    page.dataset.ready = "true";

    const input = page.querySelector("[data-note-search]");
    const buttons = [...page.querySelectorAll("[data-note-filter]")];
    const rows = [...page.querySelectorAll("[data-note-entry]")];
    const count = page.querySelector("[data-note-count]");
    const empty = page.querySelector("[data-note-empty]");
    let category = "all";

    const update = () => {
      const query = (input?.value || "").trim().toLocaleLowerCase("zh-CN");
      let visible = 0;
      rows.forEach((row) => {
        const matchesCategory = category === "all" || row.dataset.category === category;
        const matchesQuery = !query || (row.dataset.search || "").includes(query);
        row.hidden = !(matchesCategory && matchesQuery);
        if (!row.hidden) visible += 1;
      });
      if (count) count.textContent = String(visible);
      if (empty) empty.hidden = visible > 0;
    };

    buttons.forEach((button) => button.addEventListener("click", () => {
      category = button.dataset.noteFilter || "all";
      buttons.forEach((item) => {
        const active = item === button;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      update();
    }));
    input?.addEventListener("input", update);
    update();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
