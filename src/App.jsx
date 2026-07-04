import { useCallback, useMemo, useState } from "react";
import data from "./data/data.json";
import MapView from "./components/MapView";
import Timeline from "./components/Timeline";
import FiltersPanel from "./components/FiltersPanel";
import NodeCard from "./components/NodeCard";
import UnlocatedList from "./components/UnlocatedList";
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

export default function App() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  const filteredNodes = useMemo(() => applyFilters(data.nodes, filters), [filters]);
  const nodesById = useMemo(() => new Map(data.nodes.map((n) => [n.id, n])), []);
  const selectedNode = selectedNodeId ? nodesById.get(selectedNodeId) : null;

  const located = useMemo(() => filteredNodes.filter((n) => n.coordinates), [filteredNodes]);
  const unlocated = useMemo(() => filteredNodes.filter((n) => !n.coordinates), [filteredNodes]);

  const handleSelectNode = useCallback((id) => setSelectedNodeId(id), []);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-title">
          <span className="app-header-eyebrow">PHOTO LAB by VF</span>
          <h1>Историческая карта фотографии</h1>
        </div>
        <div className="app-header-meta">
          {data.nodes.length} узлов · обновлено{" "}
          {new Date(data.generatedAt).toLocaleDateString("ru-RU")}
        </div>
      </header>

      <FiltersPanel
        data={data}
        filters={filters}
        onChange={setFilters}
        resultCount={filteredNodes.length}
      />

      <main className="app-main">
        <section className="app-map">
          <MapView
            nodes={located}
            onSelectNode={handleSelectNode}
            selectedNodeId={selectedNodeId}
          />
        </section>
        <aside className="app-side">
          <NodeCard node={selectedNode} onClose={() => setSelectedNodeId(null)} />
          <UnlocatedList
            nodes={unlocated}
            onSelectNode={handleSelectNode}
            selectedNodeId={selectedNodeId}
          />
        </aside>
      </main>

      <section className="app-timeline">
        <Timeline
          nodes={filteredNodes}
          onSelectNode={handleSelectNode}
          selectedNodeId={selectedNodeId}
        />
      </section>
    </div>
  );
}
