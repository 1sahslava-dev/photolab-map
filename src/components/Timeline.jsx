import { useEffect, useRef, useState } from "react";

const PX_PER_YEAR = 6;
const MIN_WIDTH = 900;
const TOOLTIP_EVENT_MAX_CHARS = 60;

export default function Timeline({ nodes, onSelectNode, selectedNodeId, scrollContainerRef }) {
  const [hoveredId, setHoveredId] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const nodeRefsRef = useRef(new Map());
  const withDates = nodes.filter((n) => n.dateSortStart != null);

  const minYear = withDates.length ? Math.min(...withDates.map((n) => n.dateSortStart)) : 0;
  const maxYear = withDates.length ? Math.max(...withDates.map((n) => n.dateSortEnd ?? n.dateSortStart)) : 0;
  const span = Math.max(maxYear - minYear, 1);
  const width = Math.max(MIN_WIDTH, span * PX_PER_YEAR);

  const xFor = (year) => ((year - minYear) / span) * width;

  const sorted = [...withDates].sort((a, b) => a.dateSortStart - b.dateSortStart);

  // Правка 24, пункт 2б: один-два ранних выброса (например, узел XI века на
  // фоне основного кластера 1826–1881) растягивают весь диапазон шкалы —
  // при исходном scrollLeft=0 виден только этот выброс у левого края, а
  // основной кластер узлов остаётся за пределами первого экрана (это не баг
  // рендеринга — узлы есть в DOM, но визуально вне видимой прокрутки).
  // Прокручиваем к началу самого плотного 92% узлов по датам, пропуская
  // разреженный хвост.
  useEffect(() => {
    const container = scrollContainerRef?.current;
    if (!container || sorted.length < 2) return;
    const skipIndex = Math.floor(sorted.length * 0.08);
    const startYear = sorted[skipIndex]?.dateSortStart ?? minYear;
    container.scrollLeft = Math.max(0, xFor(startYear) - 40);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, scrollContainerRef]);

  // Tooltip точки шкалы виден по hover, а если не наведено — для выбранного
  // узла (selectedNodeId), даже если выбор пришёл кликом по маркеру карты, а
  // не по самой шкале (правка 27: карта и шкала теперь взаимно подсвечивают
  // друг друга при клике на любой из них, каждая — свой tooltip у себя).
  const tooltipTargetId = hoveredId ?? selectedNodeId;

  useEffect(() => {
    if (!tooltipTargetId) {
      setTooltip(null);
      return;
    }
    const el = nodeRefsRef.current.get(tooltipTargetId);
    const n = sorted.find((x) => x.id === tooltipTargetId);
    if (!el || !n) {
      setTooltip(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    const shortEvent =
      n.event && n.event.length > TOOLTIP_EVENT_MAX_CHARS
        ? `${n.event.slice(0, TOOLTIP_EVENT_MAX_CHARS - 1)}…`
        : n.event;
    setTooltip({ x: rect.left + rect.width / 2, y: rect.top, dateLabel: n.dateLabel, shortEvent });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tooltipTargetId, nodes]);

  if (withDates.length === 0) {
    return <div className="timeline timeline--empty">Нет узлов с распознанной датой для текущих фильтров.</div>;
  }

  const decadeMarks = [];
  const step = span > 400 ? 50 : span > 150 ? 20 : 10;
  for (let y = Math.ceil(minYear / step) * step; y <= maxYear; y += step) {
    decadeMarks.push(y);
  }

  return (
    <div className="timeline" style={{ width }}>
      <div className="timeline-label">История фотографии — временная шкала</div>
      <div className="timeline-track" style={{ width }}>
        <div className="timeline-axis" />
        {decadeMarks.map((y) => (
          <div key={y} className="timeline-tick" style={{ left: xFor(y) }}>
            <span>{y}</span>
          </div>
        ))}
        {sorted.map((n, i) => {
          const isRange =
            (n.dateAccuracy === "диапазон" || n.dateAccuracy === "примерно") &&
            n.dateSortEnd != null &&
            n.dateSortEnd !== n.dateSortStart;
          const left = xFor(n.dateSortStart);
          const rowLane = i % 5;
          const shortEvent =
            n.event && n.event.length > TOOLTIP_EVENT_MAX_CHARS
              ? `${n.event.slice(0, TOOLTIP_EVENT_MAX_CHARS - 1)}…`
              : n.event;
          const registerRef = (el) => {
            if (el) nodeRefsRef.current.set(n.id, el);
            else nodeRefsRef.current.delete(n.id);
          };
          return (
            <button
              key={n.id}
              ref={registerRef}
              type="button"
              className={
                "timeline-node" + (selectedNodeId === n.id ? " timeline-node--active" : "")
              }
              style={{
                left,
                top: 24 + rowLane * 26,
                "--chip-color": n.branchColor,
                width: isRange ? Math.max(xFor(n.dateSortEnd) - left, 8) : undefined,
              }}
              aria-label={`${n.dateLabel} — ${shortEvent}`}
              onClick={() => onSelectNode(n.id)}
              onMouseEnter={() => setHoveredId(n.id)}
              onMouseLeave={() => setHoveredId((cur) => (cur === n.id ? null : cur))}
              onFocus={() => setHoveredId(n.id)}
              onBlur={() => setHoveredId((cur) => (cur === n.id ? null : cur))}
            >
              {isRange && <span className="timeline-node-bar" />}
              <span className="timeline-node-dot" />
            </button>
          );
        })}
      </div>
      {/* position: fixed — намеренно вне .timeline-track, чтобы не клипаться
          overflow-y:hidden родительской .app-timeline (нужен для горизонтального
          скролла без второго, вертикального, скроллбара — см. правку 24) при
          отображении над точками верхнего ряда (см. правку 25, пункт 1). */}
      {tooltip && (
        <div className="timeline-node-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          <div className="timeline-node-tooltip-date">{tooltip.dateLabel}</div>
          <div className="timeline-node-tooltip-event">{tooltip.shortEvent}</div>
        </div>
      )}
    </div>
  );
}
