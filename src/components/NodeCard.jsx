export default function NodeCard({ node, onClose }) {
  if (!node) {
    return (
      <div className="node-card node-card--empty">
        <p>Выберите узел на карте, временной шкале или в списке, чтобы увидеть детали.</p>
      </div>
    );
  }

  const flagged = Boolean(node.checkLater) || (node.confidence && node.confidence <= 2);

  return (
    <div className="node-card">
      <div className="node-card-header">
        <span className="node-card-branch" style={{ "--chip-color": node.branchColor }}>
          <span className="branch-chip-dot" />
          {node.branch}
          {node.subBranch ? ` · ${node.subBranch}` : ""}
        </span>
        <button type="button" className="node-card-close" onClick={onClose} aria-label="Закрыть">
          ×
        </button>
      </div>

      <h3>{node.event}</h3>

      <div className="node-card-meta">
        <span>{node.dateLabel}</span>
        <span>{node.dateAccuracy}</span>
        <span>{node.id}</span>
      </div>

      {flagged && (
        <div className="node-card-flag">
          Требует доработки
          {node.confidence ? ` · уверенность ${node.confidence}/5` : ""}
        </div>
      )}

      <dl className="node-card-fields">
        {node.person && (
          <>
            <dt>Персона / группа</dt>
            <dd>{node.person}</dd>
          </>
        )}
        {(node.country || node.city) && (
          <>
            <dt>Место</dt>
            <dd>
              {node.city ? `${node.city}, ` : ""}
              {node.country}
            </dd>
          </>
        )}
        {node.technology && (
          <>
            <dt>Технология / процесс</dt>
            <dd>{node.technology}</dd>
          </>
        )}
        {node.whatChanged && (
          <>
            <dt>Что изменилось</dt>
            <dd>{node.whatChanged}</dd>
          </>
        )}
        {node.lectureComment && (
          <>
            <dt>Комментарий для лекции</dt>
            <dd>{node.lectureComment}</dd>
          </>
        )}
        {node.lessonLink && (
          <>
            <dt>Привязка к уроку</dt>
            <dd>{node.lessonLink}</dd>
          </>
        )}
      </dl>

      {node.sourceUrl && (
        <a className="node-card-source" href={node.sourceUrl} target="_blank" rel="noreferrer">
          Источник: {node.sourceName || node.sourceUrl}
          {node.confidence ? ` (уверенность ${node.confidence}/5)` : ""}
        </a>
      )}

      {node.checkLater && (
        <div className="node-card-checklater">
          <strong>Проверить позже:</strong> {node.checkLater}
        </div>
      )}

      {node.tags?.length > 0 && (
        <div className="node-card-tags">
          {node.tags.map((t) => (
            <span key={t} className="node-tag">
              #{t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
