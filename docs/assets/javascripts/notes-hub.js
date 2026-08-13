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
    const list = page.querySelector(".note-index__list");
    const sort = page.querySelector("[data-note-sort]");
    const pagination = page.querySelector("[data-note-pagination]");
    const more = page.querySelector("[data-note-more]");
    const range = page.querySelector("[data-note-range]");
    const pageSize = 10;
    let category = "all";
    let limit = pageSize;

    const rowData = (row) => ({
      title: row.querySelector(".note-row__main strong")?.textContent.trim() || "",
      updated: row.querySelector("time")?.dateTime || "",
      duration: Number.parseInt(row.querySelector(".note-row__meta small")?.textContent || "0", 10) || 0,
    });

    const compareRows = (left, right) => {
      const a = rowData(left);
      const b = rowData(right);
      if (sort?.value === "title") return a.title.localeCompare(b.title, "zh-CN");
      if (sort?.value === "duration") return a.duration - b.duration || a.title.localeCompare(b.title, "zh-CN");
      return b.updated.localeCompare(a.updated) || a.title.localeCompare(b.title, "zh-CN");
    };

    const update = ({ reset = false } = {}) => {
      if (reset) limit = pageSize;
      const query = (input?.value || "").trim().toLocaleLowerCase("zh-CN");
      const matches = rows.filter((row) => {
        const matchesCategory = category === "all" || row.dataset.category === category;
        const matchesQuery = !query || (row.dataset.search || "").includes(query);
        return matchesCategory && matchesQuery;
      });
      matches.sort(compareRows);
      matches.forEach((row) => list?.append(row));
      const matchSet = new Set(matches);
      rows.forEach((row) => { row.hidden = !matchSet.has(row); });
      matches.forEach((row, index) => { row.hidden = index >= limit; });

      const shown = Math.min(limit, matches.length);
      if (count) count.textContent = String(matches.length);
      if (empty) empty.hidden = matches.length > 0;
      if (pagination) pagination.hidden = shown >= matches.length;
      if (more) more.hidden = shown >= matches.length;
      if (range) range.textContent = `已显示 ${shown} / ${matches.length}`;
    };

    buttons.forEach((button) => button.addEventListener("click", () => {
      category = button.dataset.noteFilter || "all";
      buttons.forEach((item) => {
        const active = item === button;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      update({ reset: true });
    }));
    input?.addEventListener("input", () => update({ reset: true }));
    sort?.addEventListener("change", () => update({ reset: true }));
    more?.addEventListener("click", () => {
      limit += pageSize;
      update();
    });
    update();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
