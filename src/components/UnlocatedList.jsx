export default function UnlocatedList({ nodes, onSelectNode, selectedNodeId }) {
  if (nodes.length === 0) return null;

  return (
    <div className="unlocated-panel">
      <h4>Глобальные процессы без точки на карте ({nodes.length})</h4>
      <p className="unlocated-hint">
        Распределённые узлы (например «Европа / США») намеренно не привязаны к одной точке.
      </p>
      <ul className="unlocated-list">
        {nodes.map((n) => (
          <li key={n.id}>
            <button
              type="button"
              className={
                "unlocated-item" + (selectedNodeId === n.id ? " unlocated-item--active" : "")
              }
              style={{ "--chip-color": n.branchColor }}
              onClick={() => onSelectNode(n.id)}
            >
              <span className="branch-chip-dot" />
              <span className="unlocated-item-text">
                <strong>{n.dateLabel}</strong> — {n.event}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
