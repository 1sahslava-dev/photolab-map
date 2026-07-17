// Короткие названия уроков для тесной карточки-шага — сознательно короче,
// чем полная "Главная тема" из 03_Lessons_Map (см. data.lessons[].topic),
// заданы явно правкой 17 именно для этого узкого места интерфейса. Курс
// расширен до 100 уроков (правка 40) — вручную сокращать формулировку для
// каждого из них не нужно: для PL-008 и дальше, если явного короткого
// варианта здесь нет, берётся полная "Главная тема" прямо из xlsx (см.
// lessonTopics ниже), просто она будет чуть длиннее в самой узкой карточке.
const LESSON_SHORT_TITLES = {
  "PL-001": "Камера-обскура",
  "PL-002": "Ньепс",
  "PL-003": "Дагеротип",
  "PL-004": "Калотип",
  "PL-005": "Мокрый коллодий",
  "PL-006": "Сухие пластины",
  "PL-007": "Kodak",
};

import { useEffect, useMemo, useRef } from "react";

// Journey Mode: последовательность шагов-карточек вместо линейки с датами
// (см. правку 12, пункт 2) — сама очерёдность станций важнее их точного
// расстояния на временной прямой. Explore Mode продолжает использовать
// Timeline (линейная ось) без изменений.
export default function JourneySteps({ nodes, selectedNodeId, onSelectNode, lessons }) {
  const activeRef = useRef(null);
  const lessonTopics = useMemo(
    () => Object.fromEntries((lessons ?? []).map((l) => [l.id, l.topic])),
    [lessons],
  );

  // На мобильном лента — горизонтальный скролл, не все 7 карточек видны
  // одновременно (см. правку 33, п.2): при смене шага (клик по карточке,
  // клик по маркеру на карте, prev/next в карточке) активная карточка сама
  // прокручивается в центр видимой области. На десктопе, где обычно видно
  // все карточки сразу, эффект безвреден (scrollIntoView — no-op).
  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [selectedNodeId]);

  return (
    <div className="journey-steps">
      {nodes.map((node, i) => {
        const active = node.id === selectedNodeId;
        return (
          <button
            key={node.id}
            ref={active ? activeRef : null}
            type="button"
            className={"journey-step" + (active ? " journey-step--active" : "")}
            style={{ "--chip-color": node.branchColor }}
            onClick={() => onSelectNode(node.id)}
          >
            <span className="journey-step-number">{i + 1}</span>
            <span className="journey-step-code">{node.lessonLink}</span>
            {(LESSON_SHORT_TITLES[node.lessonLink] || lessonTopics[node.lessonLink]) && (
              <span className="journey-step-title">
                {LESSON_SHORT_TITLES[node.lessonLink] || lessonTopics[node.lessonLink]}
              </span>
            )}
            <span className="journey-step-date">{node.dateLabel}</span>
          </button>
        );
      })}
    </div>
  );
}
