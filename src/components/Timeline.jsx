const PX_PER_YEAR = 6;
const MIN_WIDTH = 900;

export default function Timeline({ nodes, onSelectNode, selectedNodeId }) {
  const withDates = nodes.filter((n) => n.dateSortStart != null);
  if (withDates.length === 0) {
    return <div className="timeline timeline--empty">Нет узлов с распознанной датой для текущих фильтров.</div>;
  }

  const minYear = Math.min(...withDates.map((n) => n.dateSortStart));
  const maxYear = Math.max(...withDates.map((n) => n.dateSortEnd ?? n.dateSortStart));
  const span = Math.max(maxYear - minYear, 1);
  const width = Math.max(MIN_WIDTH, span * PX_PER_YEAR);

  const xFor = (year) => ((year - minYear) / span) * width;

  const sorted = [...withDates].sort((a, b) => a.dateSortStart - b.dateSortStart);

  const decadeMarks = [];
  const step = span > 400 ? 50 : span > 150 ? 20 : 10;
  for (let y = Math.ceil(minYear / step) * step; y <= maxYear; y += step) {
    decadeMarks.push(y);
  }

  return (
    <div className="timeline">
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
          return (
            <button
              key={n.id}
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
              title={`${n.dateLabel} — ${n.event}`}
              onClick={() => onSelectNode(n.id)}
            >
              {isRange && <span className="timeline-node-bar" />}
              <span className="timeline-node-dot" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
