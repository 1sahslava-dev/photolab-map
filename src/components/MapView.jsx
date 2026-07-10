import { useEffect, useMemo, useRef, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import landTopology from "world-atlas/land-110m.json";
import { shapeSvg } from "../utils/nodeTypeShapes";
import { clusterNodes } from "../utils/clusterNodes";

// Стилизованный плоский атлас вместо 3D-глобуса (см. ТЗ раздел 4.1). Оба
// режима при первой загрузке показывают ВЕСЬ мир целиком (см. правку 24,
// пункт 1 — раньше у Explore Mode был фиксированный региональный bbox под
// текущую географию узлов, и он открывался на "случайном" зуме, а не на
// полном масштабе); зум/пан включены в обоих режимах, пользователь сам
// приближается к региону при желании (см. правку 4).
const WIDTH = 1000;
const HEIGHT = 640;
const FIT_MARGIN = 28;
const TOOLTIP_EVENT_MAX_CHARS = 60;

function truncateEvent(event) {
  if (!event) return event;
  return event.length > TOOLTIP_EVENT_MAX_CHARS
    ? `${event.slice(0, TOOLTIP_EVENT_MAX_CHARS - 1)}…`
    : event;
}

const landFeature = feature(landTopology, landTopology.objects.land);

// ВАЖНО: bbox для fitExtent должен быть MultiPoint, а не Polygon. Прямоугольный
// Polygon из 4 угловых точек без промежуточных вершин на рёбрах — классическая
// ловушка d3-geo: geoBounds/fitExtent определяют "внутри" кольца по вращению
// (winding), и для такого маленького прямоугольника это часто трактуется как
// "весь мир снаружи маленькой дыры", а не как сам прямоугольник — fitExtent
// в этом случае молча подгоняет проекцию под ВЕСЬ земной шар. С MultiPoint
// такой двусмысленности нет: точки не образуют кольца и не имеют "внутри/снаружи".
function bboxRegion(lonMin, latMin, lonMax, latMax) {
  return {
    type: "MultiPoint",
    coordinates: [
      [lonMin, latMin],
      [lonMax, latMin],
      [lonMax, latMax],
      [lonMin, latMax],
    ],
  };
}

function buildProjection(polygon) {
  const projection = geoMercator().fitExtent(
    [
      [FIT_MARGIN, FIT_MARGIN],
      [WIDTH - FIT_MARGIN, HEIGHT - FIT_MARGIN],
    ],
    polygon
  );
  const pathGenerator = geoPath(projection);
  return { projection, landPath: pathGenerator(landFeature) };
}

// Оба режима стартуют с видом всего мира (не автофит под текущие узлы). Широты
// ограничены разумным диапазоном (не ровно ±90) — иначе Меркатор уходит в
// бесконечность у полюсов; это тот же приём, которым пользуются большинство
// веб-карт по умолчанию.
const WORLD_BBOX = bboxRegion(-165, -56, 165, 75);
const WORLD = buildProjection(WORLD_BBOX);

const MIN_SCALE = 1;
const MAX_SCALE = 14;
const RECENTER_SCALE = 4;

function clampScale(k) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, k));
}

// Journey Mode: показ всего мира на 1 секунду, затем автоматический плавный
// зум к региону, где реально расположены 6 узлов маршрута (см. правку 6,
// пункт 2) — вычисляем bbox прямо по спроецированным точкам, а не по
// зашитым lon/lat, чтобы автозум оставался верным при любых будущих правках
// координат в мастер-файле.
const JOURNEY_INTRO_DELAY_MS = 1000;
const JOURNEY_INTRO_DURATION_MS = 1600;
const JOURNEY_INTRO_MARGIN = 100;

// Возвращает не готовую translate-трансформацию, а мировые координаты центра
// bbox + масштаб — так результат можно передать прямо в recenter(worldX,
// worldY, scale), которая сама считает translate от текущего WIDTH/HEIGHT.
function fitPointsTransform(points, margin = JOURNEY_INTRO_MARGIN) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 1);
  const spanY = Math.max(maxY - minY, 1);
  const k = clampScale(Math.min((WIDTH - margin * 2) / spanX, (HEIGHT - margin * 2) / spanY));
  return { k, worldX: (minX + maxX) / 2, worldY: (minY + maxY) / 2 };
}

// Несколько флагманских узлов могут иметь одинаковые или почти одинаковые
// координаты (напр. PL-004/005/006 все отмечены как Лондон) — без этого узлы
// рисуются строго друг на друге и верхний по z-order полностью скрывает
// остальные. Группируем проецированные точки по близости (в пикселях базовой,
// ещё не отмасштабированной проекции) — работает для произвольного N, не
// только для пары совпадений (см. правку 6, пункт 1).
const COINCIDENT_THRESHOLD_PX = 3;

function groupByProximity(points, threshold = COINCIDENT_THRESHOLD_PX) {
  const groups = [];
  for (const point of points) {
    const group = groups.find((g) => Math.hypot(g[0].x - point.x, g[0].y - point.y) < threshold);
    if (group) group.push(point);
    else groups.push([point]);
  }
  return groups;
}

function screenToViewBox(svg, clientX, clientY) {
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const local = point.matrixTransform(ctm.inverse());
  return { x: local.x, y: local.y };
}

// Каждый сегмент маршрута рисуется отдельной дугой (квадратичная кривая с
// контрольной точкой, смещённой перпендикулярно отрезку на 18% от его длины,
// без верхнего/нижнего предела — правка 29, пункт 2: раньше bow был зажат в
// 10-45px, из-за чего длинные межконтинентальные сегменты почти выпрямлялись
// и на стыках между соседними дугами читались резкие углы вместо плавной
// дуги "как в историческом атласе"), чтобы путь читался как проложенная
// станциями дорога, а не как прямая схема связей.
function arcSegmentPath(p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy) || 1;
  const bow = len * 0.18;
  const mx = (p1.x + p2.x) / 2 - (dy / len) * bow;
  const my = (p1.y + p2.y) / 2 + (dx / len) * bow;
  return `M${p1.x},${p1.y} Q${mx},${my} ${p2.x},${p2.y}`;
}

function clusterElement(point, onZoomToCluster, invScale) {
  const radius = point.count < 5 ? 14 : point.count < 15 ? 17 : 20;
  return (
    <g
      key={point.id}
      className="flatmap-cluster"
      transform={`translate(${point.x}, ${point.y}) scale(${invScale})`}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onZoomToCluster(point);
      }}
    >
      <circle r={radius} />
      <text dy="0.35em">{point.count}</text>
    </g>
  );
}

// Маркеры контрмасштабируются (scale(1/k)) относительно зума карты, чтобы
// оставаться одного и того же размера на экране на любом уровне приближения.
// Tooltip (правка 25, пункт 1; исправлено правкой 26) НЕ рендерится здесь
// как foreignObject внутри группы маркера — при плотных скоплениях соседний
// маркер, идущий позже в DOM, перекрывал его сверху (в SVG порядок отрисовки
// определяется DOM-порядком, z-index тут не работает как в HTML), а у края
// карты его дополнительно обрезал overflow:hidden контейнера .app-map.
// Вместо этого маркер только регистрирует свой DOM-узел (markerRef) и шлёт
// onHover/onLeave — единственный tooltip рендерится один раз в MapView как
// position:fixed HTML-элемент поверх всего (тот же приём, что и для точек
// временной шкалы, см. Timeline.jsx).
function exploreMarkerElement(point, onSelectNode, isSelected, invScale, markerRef, onHover, onLeave) {
  const node = point.node;
  return (
    <g
      key={point.id}
      ref={markerRef}
      className={`flatmap-marker${isSelected ? " flatmap-marker--active" : ""}`}
      transform={`translate(${point.x}, ${point.y}) scale(${invScale})`}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onSelectNode(node.id);
      }}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onLeave(node.id)}
    >
      {/* Некоторые иконки типов узла рисуются с fill="none" (см.
          nodeTypeShapes.js) — без непрозрачной area под ними клик
          проходит только по тонкой обводке. Невидимый хит-квадрат
          расширяет кликабельную зону на весь бокс иконки. */}
      <rect x="-14" y="-14" width="28" height="28" fill="transparent" />
      <g
        transform="translate(-11, -11)"
        dangerouslySetInnerHTML={{ __html: shapeSvg(node.nodeType, node.branchColor || "#c9972b") }}
      />
    </g>
  );
}

// Все 6 станций маршрута оформлены ОДИНАКОВО (единый медальон: цвет ветки +
// золотая обводка + номер шага) — форма иконки типа узла (кружок/квадрат/
// ромб и т.п.) здесь не используется, иначе шаги выглядят разнобойно, как
// в Explore Mode, а не как единая цепочка станций путешествия.
//
// Если несколько станций совпадают координатами (point.fanCount > 1, см.
// groupByProximity выше), медальон разносится веером вокруг общей "якорной"
// точки на фиксированное расстояние на экране (компенсируем invScale, как и
// сам медальон), с тонкой линией-выноской обратно к якорю — так ни одна из
// 6 станций не прячется под другой, но привязка к географии не теряется.
const FAN_SCREEN_RADIUS = 24;

function waypointElement(point, onSelectNode, isSelected, stepNumber, invScale) {
  const node = point.node;
  const fanCount = point.fanCount || 1;
  let x = point.anchorX;
  let y = point.anchorY;
  if (fanCount > 1) {
    const angle = (point.fanIndex / fanCount) * Math.PI * 2 - Math.PI / 2;
    x += Math.cos(angle) * FAN_SCREEN_RADIUS * invScale;
    y += Math.sin(angle) * FAN_SCREEN_RADIUS * invScale;
  }
  return (
    <g key={point.id}>
      {fanCount > 1 && (
        <line
          className="flatmap-waypoint-leader"
          x1={point.anchorX}
          y1={point.anchorY}
          x2={x}
          y2={y}
          vectorEffect="non-scaling-stroke"
        />
      )}
      <g
        className={`flatmap-waypoint${isSelected ? " flatmap-waypoint--active" : ""}`}
        transform={`translate(${x}, ${y}) scale(${invScale})`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onSelectNode(node.id);
        }}
      >
        <circle className="flatmap-waypoint-medallion" r="15" />
        <text className="flatmap-waypoint-number" dy="0.35em">
          {stepNumber}
        </text>
        <g className="flatmap-waypoint-tooltip" transform="translate(0, -26)">
          <rect x="-64" y="-24" width="128" height="24" rx="5" />
          <text y="-8">
            {node.lessonLink} · {node.dateLabel}
          </text>
        </g>
      </g>
    </g>
  );
}

export default function MapView({ nodes, onSelectNode, onSelectCluster, selectedNodeId, mode = "explore" }) {
  const isJourney = mode === "journey";
  const svgRef = useRef(null);
  const dragRef = useRef(null);
  const wasDraggedRef = useRef(false);
  const userInteractedRef = useRef(false);
  // Pinch-to-zoom на мобильном (правка 33): отслеживаем все активные
  // указатели по pointerId, а не только один, как для мышиного drag.
  // Pointer Events унифицируют мышь/тач/перо — pointerdown/move/up от
  // касаний приходят в те же обработчики, что и от мыши, поэтому вся логика
  // ниже расширяет уже существующий pan, а не дублирует его отдельным
  // touch-обработчиком.
  const activePointersRef = useRef(new Map());
  const pinchRef = useRef(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [animated, setAnimated] = useState(false);
  const [animDuration, setAnimDuration] = useState(700);
  const [hoveredMarkerId, setHoveredMarkerId] = useState(null);
  const [markerTooltip, setMarkerTooltip] = useState(null);
  const markerNodesRef = useRef(new Map());

  const locatedNodes = useMemo(() => nodes.filter((n) => n.coordinates), [nodes]);
  const active = WORLD;

  const projectedPoints = useMemo(
    () =>
      locatedNodes
        .map((node) => {
          const p = active.projection([node.coordinates.lon, node.coordinates.lat]);
          if (!p) return null;
          return { node, x: p[0], y: p[1] };
        })
        .filter(Boolean),
    [locatedNodes, active]
  );

  // Journey Mode показывает только 6 узлов без кластеризации (см. правку 2
  // раздела 4 первоначального ТЗ) — станции маршрута никогда не группируются
  // в кластерные бейджи, даже если совпадают координатами; вместо кластера
  // совпадающие координаты веером разносятся в waypointElement (см. правку 6,
  // пункт 1) — каждая станция остаётся видна и кликабельна отдельно.
  const points = useMemo(() => {
    if (isJourney) {
      // Номер шага берём из исходного порядка projectedPoints (1..6), а не
      // из порядка после группировки — группа совпадающих координат схлопывает
      // несколько точек в одну запись groups[], и если бы совпавшие станции
      // не шли подряд, порядок после flatten мог бы разъехаться с 1..6.
      const indexed = projectedPoints.map((p, idx) => ({ ...p, stepNumber: idx + 1 }));
      const groups = groupByProximity(indexed);
      const result = [];
      for (const group of groups) {
        group.forEach((p, i) => {
          result.push({
            isCluster: false,
            id: p.node.id,
            anchorX: p.x,
            anchorY: p.y,
            fanIndex: i,
            fanCount: group.length,
            stepNumber: p.stepNumber,
            node: p.node,
          });
        });
      }
      return result;
    }
    return clusterNodes(projectedPoints, transform.k);
  }, [projectedPoints, transform.k, isJourney]);

  const currentStepIndex = useMemo(
    () => (isJourney ? projectedPoints.findIndex((p) => p.node.id === selectedNodeId) : -1),
    [isJourney, projectedPoints, selectedNodeId]
  );

  // Два состояния сегмента (см. правки 15, 29, 30): completed — реально
  // пройденный участок, от узла 1 до текущего активного узла N включительно
  // (arrivalStep <= currentStep); future — всё остальное, в т.ч. сегмент,
  // ведущий ОТ текущего узла к следующему (он ещё не пройден, поэтому тоже
  // приглушённо-золотой, а не синий — до правки 30 здесь ошибочно был
  // отдельный синий "active"-сегмент, что красило на один сегмент вперёд).
  // Активный шаг не двигает камеру (см. правку 1), но сегменты маршрута
  // перекрашиваются мгновенно при выборе другого узла.
  const routeSegments = useMemo(() => {
    if (!isJourney || projectedPoints.length < 2) return [];
    const segments = [];
    for (let i = 0; i < projectedPoints.length - 1; i += 1) {
      const arrivalStep = i + 2; // 1-based step number of the segment's endpoint
      const currentStep = currentStepIndex >= 0 ? currentStepIndex + 1 : 0;
      const state = arrivalStep <= currentStep ? "completed" : "future";
      segments.push({
        id: `seg-${i}`,
        d: arcSegmentPath(projectedPoints[i], projectedPoints[i + 1]),
        state,
      });
    }
    return segments;
  }, [isJourney, projectedPoints, currentStepIndex]);

  const recenter = (worldX, worldY, scale, duration = 700) => {
    setAnimDuration(duration);
    setAnimated(true);
    setTransform({
      k: scale,
      x: WIDTH / 2 - worldX * scale,
      y: HEIGHT / 2 - worldY * scale,
    });
    window.setTimeout(() => setAnimated(false), duration);
  };

  const handleZoomToCluster = (point) => {
    const nextScale = clampScale(transform.k * 2.4);
    recenter(point.x, point.y, nextScale);
    onSelectCluster(point);
  };

  // Камера в Journey Mode остаётся полностью под ручным управлением
  // пользователя (см. правку 1): выбор станции только подсвечивает её и
  // обновляет карточку, но не двигает вид — иначе стартовый «весь мир
  // целиком» сразу же перескочил бы к PL-001 при загрузке.
  useEffect(() => {
    if (isJourney || !selectedNodeId) return;
    const point = projectedPoints.find((p) => p.node.id === selectedNodeId);
    if (!point) return;
    recenter(point.x, point.y, Math.max(transform.k, RECENTER_SCALE));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNodeId, isJourney]);

  // Journey Mode: 1 секунду держим вид всего мира (эффект масштаба), затем
  // сама карта плавно (1.6с, ease) приближается и центрируется на регионе,
  // где реально расположены 6 узлов маршрута — иначе медальоны слипаются в
  // нечитаемое пятно над Европой, пока пользователь не заzoomится вручную
  // (см. правку 6, пункт 2). Ручные зум/пан остаются доступны всё время,
  // включая эту секунду ожидания и саму анимацию.
  useEffect(() => {
    if (!isJourney || projectedPoints.length === 0) return;
    const target = fitPointsTransform(projectedPoints);
    const timer = window.setTimeout(() => {
      // Если пользователь уже сам зумил/двигал карту за эту первую секунду —
      // не перебиваем его выбор автозумом к региону маршрута.
      if (userInteractedRef.current) return;
      recenter(target.worldX, target.worldY, target.k, JOURNEY_INTRO_DURATION_MS);
    }, JOURNEY_INTRO_DELAY_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isJourney]);

  const handleWheel = (e) => {
    e.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;
    userInteractedRef.current = true;
    setAnimated(false);
    const cursor = screenToViewBox(svg, e.clientX, e.clientY);
    const factor = Math.exp(-e.deltaY * 0.0015);
    setTransform((t) => {
      const k = clampScale(t.k * factor);
      const worldX = (cursor.x - t.x) / t.k;
      const worldY = (cursor.y - t.y) / t.k;
      return { k, x: cursor.x - worldX * k, y: cursor.y - worldY * k };
    });
  };

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.addEventListener("wheel", handleWheel, { passive: false });
    return () => svg.removeEventListener("wheel", handleWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePointerDown = (e) => {
    const svg = svgRef.current;
    if (!svg) return;
    userInteractedRef.current = true;
    setAnimated(false);
    // setPointerCapture может кинуть NotFoundError в редких гонках (палец
    // уже отпущен к моменту вызова) — без try/catch это обрывает остальную
    // часть обработчика, и второй палец пинча никогда не регистрируется в
    // activePointersRef, из-за чего pinch тихо не включается.
    try {
      svg.setPointerCapture(e.pointerId);
    } catch {
      // ignore — палец уже не активен, следующий pointermove для него не придёт
    }
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointersRef.current.size === 2) {
      // Второй палец опустился — переходим в режим pinch, одиночный drag
      // (если был начат первым пальцем) отменяем, чтобы он не конфликтовал.
      dragRef.current = null;
      const [p1, p2] = Array.from(activePointersRef.current.values());
      const distance = Math.hypot(p1.x - p2.x, p1.y - p2.y) || 1;
      const midScreen = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      const midViewBox = screenToViewBox(svg, midScreen.x, midScreen.y);
      pinchRef.current = {
        startDistance: distance,
        startK: transform.k,
        // Мировая точка под серединой между пальцами в момент начала пинча —
        // именно она должна остаться под пальцами при последующем move,
        // так пинч одновременно и зумит, и панит вслед за движением руки.
        worldX: (midViewBox.x - transform.x) / transform.k,
        worldY: (midViewBox.y - transform.y) / transform.k,
      };
    } else if (activePointersRef.current.size === 1) {
      const start = screenToViewBox(svg, e.clientX, e.clientY);
      dragRef.current = { start, startTransform: transform, moved: false };
    }
  };

  const handlePointerMove = (e) => {
    if (!activePointersRef.current.has(e.pointerId)) return;
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const svg = svgRef.current;
    if (!svg) return;

    if (activePointersRef.current.size >= 2 && pinchRef.current) {
      const [p1, p2] = Array.from(activePointersRef.current.values());
      const distance = Math.hypot(p1.x - p2.x, p1.y - p2.y) || 1;
      const factor = distance / pinchRef.current.startDistance;
      const k = clampScale(pinchRef.current.startK * factor);
      const midScreen = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      const midViewBox = screenToViewBox(svg, midScreen.x, midScreen.y);
      const { worldX, worldY } = pinchRef.current;
      setTransform({ k, x: midViewBox.x - worldX * k, y: midViewBox.y - worldY * k });
      return;
    }

    const drag = dragRef.current;
    if (!drag) return;
    const cur = screenToViewBox(svg, e.clientX, e.clientY);
    const dx = cur.x - drag.start.x;
    const dy = cur.y - drag.start.y;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) drag.moved = true;
    setTransform({ ...drag.startTransform, x: drag.startTransform.x + dx, y: drag.startTransform.y + dy });
  };

  const handlePointerUp = (e) => {
    activePointersRef.current.delete(e.pointerId);

    if (activePointersRef.current.size < 2) {
      pinchRef.current = null;
    }

    if (activePointersRef.current.size === 1) {
      // Один палец отпущен во время пинча — продолжаем как обычный drag от
      // текущей позиции оставшегося пальца, без "прыжка" карты.
      const svg = svgRef.current;
      const [remaining] = activePointersRef.current.values();
      const start = svg ? screenToViewBox(svg, remaining.x, remaining.y) : { x: 0, y: 0 };
      dragRef.current = { start, startTransform: transform, moved: true };
      return;
    }

    if (activePointersRef.current.size === 0) {
      wasDraggedRef.current = Boolean(dragRef.current?.moved);
      dragRef.current = null;
    }
  };

  // Клик по пустому месту карты снимает выбор узла и скрывает tooltip маркера
  // (правка 25, пункт 1) — маркеры/кластеры сами вызывают stopPropagation в
  // своих onClick, так что сюда долетают только клики мимо них. В Journey
  // Mode выбор станции не сбрасывается кликом по фону (там нет "снятия
  // выбора" в принципе — карточка справа всегда показывает текущий шаг).
  const handleBackgroundClick = () => {
    if (wasDraggedRef.current) {
      wasDraggedRef.current = false;
      return;
    }
    if (!isJourney) onSelectNode(null);
  };

  const guardedSelectNode = (id) => {
    if (wasDraggedRef.current) {
      wasDraggedRef.current = false;
      return;
    }
    onSelectNode(id);
  };

  const guardedZoomToCluster = (point) => {
    if (wasDraggedRef.current) {
      wasDraggedRef.current = false;
      return;
    }
    handleZoomToCluster(point);
  };

  const registerMarkerNode = (id) => (el) => {
    if (el) markerNodesRef.current.set(id, el);
    else markerNodesRef.current.delete(id);
  };

  const handleMarkerHover = (id) => setHoveredMarkerId(id);
  const handleMarkerLeave = (id) => setHoveredMarkerId((cur) => (cur === id ? null : cur));

  // Единственный tooltip маркера Explore Mode — id берётся из hover, а если
  // мышь не над маркером, но узел выбран кликом, из selectedNodeId (правка
  // 26): так тач-устройства без hover тоже видят tooltip после тапа.
  const tooltipTargetId = isJourney ? null : hoveredMarkerId ?? selectedNodeId;

  useEffect(() => {
    if (!tooltipTargetId) {
      setMarkerTooltip(null);
      return;
    }
    const node = markerNodesRef.current.get(tooltipTargetId);
    const point = projectedPoints.find((p) => p.node.id === tooltipTargetId);
    if (!node || !point) {
      setMarkerTooltip(null);
      return;
    }
    const rect = node.getBoundingClientRect();
    const n = point.node;
    setMarkerTooltip({
      x: rect.left + rect.width / 2,
      y: rect.top,
      code: n.lessonLink || n.id,
      dateLabel: n.dateLabel,
      event: truncateEvent(n.event),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tooltipTargetId, transform, animated, projectedPoints]);

  const zoomByButton = (factor) => {
    setAnimDuration(300);
    setAnimated(true);
    setTransform((t) => {
      const k = clampScale(t.k * factor);
      const worldX = (WIDTH / 2 - t.x) / t.k;
      const worldY = (HEIGHT / 2 - t.y) / t.k;
      return { k, x: WIDTH / 2 - worldX * k, y: HEIGHT / 2 - worldY * k };
    });
    window.setTimeout(() => setAnimated(false), 300);
  };

  const resetView = () => recenter(WIDTH / 2, HEIGHT / 2, 1);

  return (
    <div className={"flatmap" + (isJourney ? " flatmap--journey-atlas" : "")}>
      <svg
        ref={svgRef}
        className="flatmap-svg"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleBackgroundClick}
      >
        <defs>
          {/* Лёгкая зернистость бумаги — вместо гладкой векторной заливки. */}
          <filter id="paperGrain">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="noise" />
            <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.02 0" />
          </filter>
          {/* Journey Mode: отдельная "музейная атлас"-тема (см. запрос
              "карта должна выглядеть богаче") — тёплый плоский фон + более
              глубокие, насыщенные тона суши. Раньше фон был radial-gradient
              и была отдельная виньетка по краям — обе статичны поверх
              пана/зума (не участвуют в transform самой карты), из-за чего
              выглядели как неподвижное "окошко со шторками"; убраны в правке
              23. Explore Mode использует плоские цвета (--ink/--explore-land)
              вместо градиента — тёмная тема, см. правку 31. */}
          <linearGradient id="journeyLandShade" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbf1d9" />
            <stop offset="33%" stopColor="#fbf1d9" />
            <stop offset="33%" stopColor="#e2c592" />
            <stop offset="66%" stopColor="#e2c592" />
            <stop offset="66%" stopColor="#b8935a" />
            <stop offset="100%" stopColor="#b8935a" />
          </linearGradient>
          {/* Вариант C (см. правку 4): рельеф через SVG bevel/emboss на
              контурах суши — программная заливка одним цветом технически не
              может дать вид гравюры, поэтому вместо донастройки параметров
              заливки меняем сам метод отрисовки на светотеневой. Обязательный
              базовый слой независимо от того, добавится ли позже текстура
              бумаги (вариант B).
              Это ободковый (emboss) эффект: он высвечивает только КРОМКУ
              берега, где есть градиент альфы — внутренность материка
              физически не может засветиться этим методом, это не баг.
              specularConstant/stdDeviation заданы РАЗНЫМИ для Journey и
              Explore: у Explore на порядок более плотная береговая линия
              (58 узлов, весь Атлантика/Европа/Ближний Восток в одном bbox),
              и то же значение, что даёт заметный рельеф в Journey, у Explore
              засвечивает карту почти до белого из-за наложения множества
              близких кромок (см. правку 6, пункт 3). */}
          <filter id="landBevel" x="-20%" y="-20%" width="140%" height="140%">
            {/* stdDeviation обратно пропорционален зуму (как invScale у
                маркеров) — иначе при виде всего мира целиком (маленький k)
                фиксированный радиус блюра оказывается больше самих стран и
                засвечивает всю заливку, а не только кромку берега. */}
            <feGaussianBlur in="SourceAlpha" stdDeviation={(isJourney ? 1.2 : 0.18) / transform.k} result="blur" />
            <feSpecularLighting
              in="blur"
              surfaceScale="1.6"
              specularConstant={isJourney ? 0.25 : 0.22}
              specularExponent="12"
              lightingColor="#fff6e0"
              result="spec"
            >
              <feDistantLight azimuth="235" elevation="55" />
            </feSpecularLighting>
            <feComposite in="spec" in2="SourceAlpha" operator="in" result="specClipped" />
            <feComposite
              in="SourceGraphic"
              in2="specClipped"
              operator="arithmetic"
              k1="0"
              k2="1"
              k3="1"
              k4="0"
            />
          </filter>
        </defs>
        <rect
          className={"flatmap-bg" + (isJourney ? " flatmap-bg--journey" : "")}
          x="0"
          y="0"
          width={WIDTH}
          height={HEIGHT}
        />
        <rect className="flatmap-grain" x="0" y="0" width={WIDTH} height={HEIGHT} filter="url(#paperGrain)" />
        <g
          style={{ transition: animated ? `transform ${animDuration}ms ease` : "none" }}
          transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}
        >
          <path
            className={"flatmap-land" + (isJourney ? " flatmap-land--journey" : "")}
            d={active.landPath}
            vectorEffect="non-scaling-stroke"
          />
          {routeSegments.map((seg) => (
            <path
              key={seg.id}
              className={`flatmap-route flatmap-route--${seg.state}`}
              d={seg.d}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {points.map((point) => {
            const invScale = 1 / transform.k;
            if (point.isCluster) return clusterElement(point, guardedZoomToCluster, invScale);
            if (isJourney) {
              return waypointElement(point, guardedSelectNode, point.id === selectedNodeId, point.stepNumber, invScale);
            }
            return exploreMarkerElement(
              point,
              guardedSelectNode,
              point.id === selectedNodeId,
              invScale,
              registerMarkerNode(point.id),
              handleMarkerHover,
              handleMarkerLeave
            );
          })}
        </g>
      </svg>
      <div className="flatmap-controls">
        <button type="button" onClick={() => zoomByButton(1.6)} aria-label="Приблизить">
          +
        </button>
        <button type="button" onClick={() => zoomByButton(1 / 1.6)} aria-label="Отдалить">
          −
        </button>
        <button type="button" onClick={resetView} aria-label="Сбросить вид">
          ⟲
        </button>
      </div>
      {/* position: fixed, вне SVG — правка 26: раньше tooltip рендерился
          foreignObject'ом внутри группы каждого маркера, и при плотных
          скоплениях соседний маркер, идущий позже в DOM, перекрывал его
          сверху (порядок отрисовки в SVG определяется DOM-порядком, а не
          z-index), плюс у края карты его обрезал overflow:hidden контейнера
          .app-map. Один общий tooltip, вынесенный за пределы SVG, всегда
          поверх всего и не подчиняется overflow предков (тот же приём, что
          и для точек временной шкалы, см. Timeline.jsx). */}
      {markerTooltip && (
        <div className="flatmap-marker-tooltip" style={{ left: markerTooltip.x, top: markerTooltip.y }}>
          <div className="flatmap-marker-tooltip-code">
            {markerTooltip.code} · {markerTooltip.dateLabel}
          </div>
          <div className="flatmap-marker-tooltip-event">{markerTooltip.event}</div>
        </div>
      )}
    </div>
  );
}
