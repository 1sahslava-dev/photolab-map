import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import data from "./data/data.json";
import MapView from "./components/MapView";
import Timeline from "./components/Timeline";
import JourneySteps from "./components/JourneySteps";
import FiltersPanel from "./components/FiltersPanel";
import NodeCard from "./components/NodeCard";
import UnlocatedList from "./components/UnlocatedList";
import ClusterList from "./components/ClusterList";
import "./App.css";

const DEFAULT_FILTERS = {
  lesson: null,
  branch: null,
  nodeType: null,
  country: null,
  minConfidence: 1,
  onlyFlagged: false,
};

function applyFilters(nodes, filters) {
  return nodes.filter((n) => {
    if (filters.lesson && n.lessonLink !== filters.lesson) return false;
    if (filters.branch && n.branch !== filters.branch) return false;
    if (filters.nodeType && n.nodeType !== filters.nodeType) return false;
    if (filters.country && n.country !== filters.country) return false;
    if ((n.confidence ?? 5) < filters.minConfidence) return false;
    if (filters.onlyFlagged && !n.checkLater && !(n.confidence && n.confidence <= 2)) return false;
    return true;
  });
}

const nodesById = new Map(data.nodes.map((n) => [n.id, n]));
// Порядок маршрута — только по journeyNodeIds (PL-001…PL-006 из конвертера),
// не по координатной близости и не по prevLink/nextLink (см. ТЗ раздел 4.2).
const journeyNodes = data.journeyNodeIds.map((id) => nodesById.get(id)).filter(Boolean);
// Ссылка на Telegram-урок приходит из данных (03_Lessons_Map, колонка F),
// не захардкожена в компоненте — при обновлении xlsx на прямые ссылки на
// конкретные посты код трогать не придётся (см. правку 11).
const lessonsById = new Map(data.lessons.map((l) => [l.id, l]));

export default function App() {
  const [mode, setMode] = useState("journey");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [activeCluster, setActiveCluster] = useState(null);
  const [journeySelectedId, setJourneySelectedId] = useState(journeyNodes[0]?.id ?? null);
  const asideRef = useRef(null);
  const timelineRef = useRef(null);

  useEffect(() => {
    asideRef.current?.scrollTo({ top: 0 });
  }, [mode, journeySelectedId, selectedNodeId, activeCluster]);

  const filteredNodes = useMemo(() => applyFilters(data.nodes, filters), [filters]);
  const selectedNode = selectedNodeId ? nodesById.get(selectedNodeId) : null;

  const located = useMemo(() => filteredNodes.filter((n) => n.coordinates), [filteredNodes]);
  const unlocated = useMemo(() => filteredNodes.filter((n) => !n.coordinates), [filteredNodes]);

  const handleSelectNode = useCallback((id) => {
    setSelectedNodeId(id);
    setActiveCluster(null);
  }, []);

  const handleSelectCluster = useCallback((cluster) => {
    setSelectedNodeId(null);
    setActiveCluster(cluster);
  }, []);

  const journeyIndex = journeyNodes.findIndex((n) => n.id === journeySelectedId);
  const journeySelectedNode = journeyIndex >= 0 ? journeyNodes[journeyIndex] : null;
  const journeyStep = journeySelectedNode
    ? {
        index: journeyIndex + 1,
        total: journeyNodes.length,
        onPrev: journeyIndex > 0 ? () => setJourneySelectedId(journeyNodes[journeyIndex - 1].id) : null,
        onNext:
          journeyIndex < journeyNodes.length - 1
            ? () => setJourneySelectedId(journeyNodes[journeyIndex + 1].id)
            : null,
      }
    : null;

  return (
    <div className="app-shell" data-mode={mode}>
      <header className="app-header">
        <div className="app-header-title">
          <span className="app-header-eyebrow">PHOTO LAB by VF</span>
          <h1>Историческая карта фотографии</h1>
        </div>
        <div className="app-header-controls">
          <div className="mode-switcher">
            <button
              type="button"
              className={
                "mode-switcher-btn" + (mode === "journey" ? " mode-switcher-btn--active" : "")
              }
              onClick={() => setMode("journey")}
            >
              Маршрут
            </button>
            <button
              type="button"
              className={
                "mode-switcher-btn" + (mode === "explore" ? " mode-switcher-btn--active" : "")
              }
              onClick={() => setMode("explore")}
            >
              Исследование
            </button>
          </div>
          <div className="app-header-meta">
            {mode === "journey"
              ? `${journeyNodes.length} шагов маршрута`
              : `${data.nodes.length} узлов · обновлено ${new Date(data.generatedAt).toLocaleDateString("ru-RU")}`}
          </div>
        </div>
      </header>

      {mode === "explore" && (
        <FiltersPanel data={data} filters={filters} onChange={setFilters} resultCount={filteredNodes.length} />
      )}

      <main className="app-main">
        <section className="app-map">
          {mode === "journey" ? (
            <MapView
              key="journey"
              mode="journey"
              nodes={journeyNodes}
              onSelectNode={setJourneySelectedId}
              onSelectCluster={() => {}}
              selectedNodeId={journeySelectedId}
            />
          ) : (
            <MapView
              key="explore"
              mode="explore"
              nodes={located}
              onSelectNode={handleSelectNode}
              onSelectCluster={handleSelectCluster}
              selectedNodeId={selectedNodeId}
            />
          )}
        </section>
        <aside className={"app-side" + (mode === "journey" ? " app-side--journey" : "")} ref={asideRef}>
          {mode === "journey" ? (
            <NodeCard
              node={journeySelectedNode}
              journeyStep={journeyStep}
              telegramUrl={lessonsById.get(journeySelectedNode?.lessonLink)?.telegramUrl}
            />
          ) : activeCluster ? (
            <ClusterList cluster={activeCluster} onSelectNode={handleSelectNode} onClose={() => setActiveCluster(null)} />
          ) : (
            <NodeCard
              node={selectedNode}
              onClose={() => setSelectedNodeId(null)}
              telegramUrl={lessonsById.get(selectedNode?.lessonLink)?.telegramUrl}
            />
          )}
          {mode === "explore" && (
            <UnlocatedList nodes={unlocated} onSelectNode={handleSelectNode} selectedNodeId={selectedNodeId} />
          )}
        </aside>
      </main>

      <section className="app-timeline" ref={timelineRef}>
        {mode === "journey" ? (
          <JourneySteps nodes={journeyNodes} onSelectNode={setJourneySelectedId} selectedNodeId={journeySelectedId} />
        ) : (
          <Timeline
            nodes={filteredNodes}
            onSelectNode={handleSelectNode}
            selectedNodeId={selectedNodeId}
            scrollContainerRef={timelineRef}
          />
        )}
      </section>
    </div>
  );
}
