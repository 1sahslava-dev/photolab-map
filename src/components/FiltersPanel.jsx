import { useState } from "react";

function isActive(filters) {
  return (
    Boolean(filters.lesson) ||
    Boolean(filters.branch) ||
    Boolean(filters.nodeType) ||
    Boolean(filters.country) ||
    filters.minConfidence > 1 ||
    filters.onlyFlagged
  );
}

export default function FiltersPanel({ data, filters, onChange, resultCount }) {
  const [expanded, setExpanded] = useState(false);
  const set = (patch) => onChange({ ...filters, ...patch });

  const activeBranch = filters.branch;
  const active = isActive(filters);

  return (
    <div className="filters-panel">
      <div className="filters-bar">
        <button
          type="button"
          className={"filters-toggle" + (active ? " filters-toggle--active" : "")}
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          Фильтры {active ? "•" : ""} {expanded ? "▴" : "▾"}
        </button>
        <span className="filters-count">{resultCount} узлов</span>
      </div>

      {expanded && (
        <>
          {/* Только мобильный Explore Mode (правка 36) — .filters-body там
              становится bottom sheet, эта подложка гасит тап "мимо" панели,
              закрывая её. На десктопе не рендерится визуально (display:none
              вне мобильного media query в App.css). */}
          <div className="filters-backdrop" onClick={() => setExpanded(false)} />
          <div className="filters-body">
          <div className="filters-row">
            <label className="filter-field">
              <span>Урок</span>
              <select
                value={filters.lesson || ""}
                onChange={(e) => set({ lesson: e.target.value || null })}
              >
                <option value="">Все уроки</option>
                {data.filters.lessons.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </label>

            <label className="filter-field">
              <span>Тип узла</span>
              <select
                value={filters.nodeType || ""}
                onChange={(e) => set({ nodeType: e.target.value || null })}
              >
                <option value="">Все типы</option>
                {data.filters.nodeTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>

            <label className="filter-field">
              <span>Страна</span>
              <select
                value={filters.country || ""}
                onChange={(e) => set({ country: e.target.value || null })}
              >
                <option value="">Все страны</option>
                {data.filters.countries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label className="filter-field filter-field--confidence">
              <span>Мин. уверенность: {filters.minConfidence}</span>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={filters.minConfidence}
                onChange={(e) => set({ minConfidence: Number(e.target.value) })}
              />
            </label>

            <label className="filter-field filter-field--checkbox">
              <input
                type="checkbox"
                checked={filters.onlyFlagged}
                onChange={(e) => set({ onlyFlagged: e.target.checked })}
              />
              <span>Только требующие доработки</span>
            </label>

            <button
              type="button"
              className="filters-reset"
              onClick={() =>
                onChange({
                  lesson: null,
                  branch: null,
                  nodeType: null,
                  country: null,
                  minConfidence: 1,
                  onlyFlagged: false,
                })
              }
            >
              Сбросить
            </button>
          </div>

          <div className="branch-legend">
            {data.branches.map((b) => (
              <button
                key={b.name}
                type="button"
                className={
                  "branch-chip" + (activeBranch === b.name ? " branch-chip--active" : "")
                }
                style={{ "--chip-color": b.colorHex || "#999" }}
                title={b.comment || ""}
                onClick={() => set({ branch: activeBranch === b.name ? null : b.name })}
              >
                <span className="branch-chip-dot" />
                {b.name}
              </button>
            ))}
          </div>
          </div>
        </>
      )}
    </div>
  );
}
