(() => {
  const initNotesHub = () => {
    const hub = document.querySelector("[data-notes-hub]");
    if (!hub || hub.dataset.ready === "true") return;
    hub.dataset.ready = "true";

    const search = hub.querySelector("[data-note-search]");
    const filters = [...hub.querySelectorAll("[data-note-filter]")];
    const entries = [...hub.querySelectorAll(".notes-library__list [data-note-entry]")];
    const counter = hub.querySelector("[data-note-count]");
    const empty = hub.querySelector("[data-note-empty]");
    let activeCategory = "all";

    const normalize = (value) => value.trim().toLocaleLowerCase("zh-CN");

    const applyFilters = () => {
      const query = normalize(search?.value || "");
      let visible = 0;

      entries.forEach((entry) => {
        const categoryMatches = activeCategory === "all" || entry.dataset.category === activeCategory;
        const textMatches = !query || normalize(entry.dataset.search || "").includes(query);
        const matches = categoryMatches && textMatches;
        entry.hidden = !matches;
        if (matches) visible += 1;
      });

      if (counter) counter.textContent = String(visible);
      if (empty) empty.hidden = visible !== 0;
    };

    filters.forEach((button) => {
      button.addEventListener("click", () => {
        activeCategory = button.dataset.noteFilter || "all";
        filters.forEach((candidate) => {
          const active = candidate === button;
          candidate.classList.toggle("is-active", active);
          candidate.setAttribute("aria-pressed", String(active));
        });
        applyFilters();
      });
    });

    search?.addEventListener("input", applyFilters);
    applyFilters();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initNotesHub, { once: true });
  } else {
    initNotesHub();
  }
})();
