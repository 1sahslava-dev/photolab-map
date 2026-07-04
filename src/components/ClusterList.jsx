export default function ClusterList({ cluster, onSelectNode, onClose }) {
  if (!cluster) return null;

  const sorted = [...cluster.childNodes].sort(
    (a, b) => (a.dateSortStart ?? 0) - (b.dateSortStart ?? 0)
  );

  return (
    <div className="node-card cluster-list">
      <div className="node-card-header">
        <span className="node-card-branch">Группа из {sorted.length} узлов рядом</span>
        <button type="button" className="node-card-close" onClick={onClose} aria-label="Закрыть">
          ×
        </button>
      </div>
      <p className="unlocated-hint">
        Координаты этих узлов слишком близки, чтобы разъехаться на глобусе. Выберите
        нужный:
      </p>
      <ul className="unlocated-list">
        {sorted.map((n) => (
          <li key={n.id}>
            <button
              type="button"
              className="unlocated-item"
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
