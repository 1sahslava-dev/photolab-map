import { useState } from "react";

// Journey Mode-версия "Подробнее": кастомный анимированный disclosure
// (стрелка поворачивается, тело раскрывается плавно через grid-template-rows,
// а не резкий нативный <details>) + компактная строка чипов вместо
// вертикального списка "ЛЕЙБЛ: значение" (см. правку 12, пункт 1). Explore
// Mode не трогаем — у него отдельная, инлайновая вёрстка ниже в NodeCard.
function JourneyDisclosure({ node }) {
  const [open, setOpen] = useState(false);
  const flagged = Boolean(node.checkLater) || (node.confidence && node.confidence <= 2);

  const chips = [];
  if (node.branch) chips.push({ dot: node.branchColor, value: node.branch });
  if (node.person) chips.push({ value: node.person });
  if (node.country || node.city) {
    chips.push({ value: `${node.city ? node.city + ", " : ""}${node.country}` });
  }
  if (node.technology) chips.push({ value: node.technology });
  if (node.subBranch) chips.push({ value: node.subBranch });
  if (node.nodeType) chips.push({ value: node.nodeType });

  return (
    <div className={"node-card-disclosure" + (open ? " node-card-disclosure--open" : "")}>
      <button
        type="button"
        className="node-card-disclosure-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="node-card-disclosure-chevron">▸</span>
        Подробнее
      </button>
      <div className="node-card-disclosure-body">
        <div className="node-card-disclosure-body-inner">
          {flagged && (
            <div className="node-card-flag">
              Требует доработки
              {node.confidence ? ` · уверенность ${node.confidence}/5` : ""}
            </div>
          )}

          {chips.length > 0 && (
            <div className="node-card-chips">
              {chips.map((c, i) => (
                <span key={i} className="node-card-chip" style={c.dot ? { "--chip-color": c.dot } : undefined}>
                  {c.dot && <span className="branch-chip-dot" />}
                  {c.value}
                </span>
              ))}
            </div>
          )}

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
      </div>
    </div>
  );
}

// Иконка — единственное место, где используется Telegram Blue (#27A7E7,
// см. брендбук); сам текст ссылки остаётся в цвете текста карточки, а не
// системным синим цветом браузерной ссылки (см. правку 11).
function TelegramLink({ url }) {
  if (!url) return null;
  return (
    <a className="node-card-telegram" href={url} target="_blank" rel="noreferrer">
      <svg viewBox="0 0 240 240" width="18" height="18" aria-hidden="true">
        <circle cx="120" cy="120" r="120" fill="#27A7E7" />
        <path
          fill="#fff"
          d="M180 72l-20.5 96.7c-1.5 6.9-5.6 8.6-11.3 5.4l-31.2-23-15 14.5c-1.7 1.7-3.1 3.1-6.3 3.1l2.2-31.8L156 79.7c2.5-2.2-.5-3.5-3.9-1.3l-71.6 45.1-30.9-9.6c-6.7-2.1-6.8-6.7 1.4-9.9l120.6-46.5c5.6-2 10.5 1.3 8.7 9.5z"
        />
      </svg>
      Читать урок в Telegram
    </a>
  );
}

// Короткий редакционный заголовок шага — не длинное техническое "событие"
// из базы (node.event), а самостоятельная, отдельно составленная строка
// (см. правку 19). Дан явно только для PL-001..007, дальше по тому же
// шаблону "Тема: суть перемены" — можно добавлять сюда по мере написания
// уроков. Курс рассчитан на 100 уроков (правка 40): для PL-008 и дальше,
// пока явной редакционной строки нет, заголовком становится «Главная тема»
// урока прямо из master.xlsx (lessonTopic, см. App.jsx/lessonsById), и
// только если её тоже нет — сырое node.event.
const JOURNEY_HEADLINES = {
  "PL-001": "Камера-обскура: свет впервые объясняет изображение",
  "PL-002": "Ньепс: первое сохранившееся изображение в истории",
  "PL-003": "Дагеротип: резкость, которая убедила мир",
  "PL-004": "Калотип: один негатив — множество отпечатков",
  "PL-005": "Мокрый коллодий: резкость и тираж наконец вместе",
  "PL-006": "Сухие пластины: фотография больше не должна спешить",
  "PL-007": "Kodak: нажми на кнопку — остальное сделаем мы",
};

function JourneyCard({ node, journeyStep, telegramUrl, lessonTopic }) {
  const headline = JOURNEY_HEADLINES[node.lessonLink] || lessonTopic || node.event;
  const metaParts = [
    node.lessonLink && <span key="lesson" className="node-card-journey-lesson">{node.lessonLink}</span>,
    node.person && <span key="person">{node.person}</span>,
    [node.dateLabel, node.country].filter(Boolean).join(" · ") && (
      <span key="place">{[node.dateLabel, node.country].filter(Boolean).join(" · ")}</span>
    ),
  ].filter(Boolean);

  return (
    <div className="node-card node-card--journey" style={{ "--chip-color": node.branchColor }}>
      <div className="node-card-journey-step">Шаг {journeyStep.index} из {journeyStep.total}</div>

      {metaParts.length > 0 && <div className="node-card-journey-meta">{metaParts}</div>}

      <h2 className="node-card-journey-headline">{headline}</h2>

      <div className="node-card-journey-block">
        <span className="node-card-journey-label">Главная идея</span>
        <p>{node.event}</p>
      </div>

      {node.whatChanged && (
        <div className="node-card-journey-block">
          <span className="node-card-journey-label">Что изменилось</span>
          <p>{node.whatChanged}</p>
        </div>
      )}

      {node.lectureComment && (
        <div className="node-card-journey-block">
          <span className="node-card-journey-label">Почему это важно</span>
          <p>{node.lectureComment}</p>
        </div>
      )}

      <TelegramLink url={telegramUrl} />

      <JourneyDisclosure node={node} />

      <div className="node-card-journey-nav">
        <button type="button" disabled={!journeyStep.onPrev} onClick={journeyStep.onPrev}>
          ← Предыдущий шаг
        </button>
        {journeyStep.onNext ? (
          <button type="button" onClick={journeyStep.onNext}>
            Следующий шаг →
          </button>
        ) : (
          <p className="node-card-journey-next-hint">
            Дальше — плёнка, цвет, цифровая фотография (в разработке)
          </p>
        )}
      </div>
    </div>
  );
}

export default function NodeCard({ node, onClose, journeyStep, telegramUrl, lessonTopic }) {
  if (!node) {
    return (
      <div className="node-card node-card--empty">
        <p>Выберите узел на карте, временной шкале или в списке, чтобы увидеть детали.</p>
      </div>
    );
  }

  if (journeyStep) {
    return <JourneyCard node={node} journeyStep={journeyStep} telegramUrl={telegramUrl} lessonTopic={lessonTopic} />;
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
        {onClose && (
          <button type="button" className="node-card-close" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        )}
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

      <TelegramLink url={telegramUrl} />

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
