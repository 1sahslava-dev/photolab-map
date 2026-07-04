import { useEffect, useMemo, useRef, useState } from "react";
import Globe from "react-globe.gl";
import { shapeSvg } from "../utils/nodeTypeShapes";
import { clusterNodes } from "../utils/clusterNodes";

const GLOBE_TEXTURE = "/textures/earth-day.jpg";
const BUMP_TEXTURE = "/textures/earth-topology.png";
const INITIAL_VIEW = { lat: 46, lng: 8, altitude: 1.4 };

function useElementSize() {
  const ref = useRef(null);
  const [size, setSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setSize({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, size];
}

function makeLeafElement(point, onSelectNode) {
  const el = document.createElement("div");
  el.className = "globe-marker";
  el.innerHTML = shapeSvg(point.node.nodeType, point.node.branchColor || "#c9972b");
  el.title = `${point.node.dateLabel} — ${point.node.event}`;
  el.addEventListener("click", (e) => {
    e.stopPropagation();
    onSelectNode(point.node.id);
  });
  return el;
}

function makeClusterElement(point, onZoomToCluster) {
  const size = point.count < 5 ? 32 : point.count < 15 ? 40 : 48;
  const el = document.createElement("div");
  el.className = "plm-cluster-icon globe-cluster";
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.textContent = String(point.count);
  el.addEventListener("click", (e) => {
    e.stopPropagation();
    onZoomToCluster(point);
  });
  return el;
}

export default function MapView({ nodes, onSelectNode, onSelectCluster, selectedNodeId }) {
  const [containerRef, size] = useElementSize();
  const globeRef = useRef(null);
  const [altitude, setAltitude] = useState(INITIAL_VIEW.altitude);
  const [ready, setReady] = useState(false);

  const locatedNodes = useMemo(() => nodes.filter((n) => n.coordinates), [nodes]);
  const points = useMemo(
    () => clusterNodes(locatedNodes, altitude),
    [locatedNodes, altitude]
  );

  const handleClusterClick = (point) => {
    const globe = globeRef.current;
    if (globe) {
      const nextAltitude = Math.max(altitude * 0.35, 0.4);
      globe.pointOfView({ lat: point.lat, lng: point.lng, altitude: nextAltitude }, 700);
    }
    // Приближение может не разъединить узлы с одинаковыми координатами
    // города (см. ТЗ) — поэтому список содержимого кластера открываем
    // независимо от того, разделится ли он визуально.
    onSelectCluster(point);
  };

  useEffect(() => {
    const globe = globeRef.current;
    const container = containerRef.current;
    if (!globe || !container || !ready) return;
    globe.pointOfView(INITIAL_VIEW, 0);
    const controls = globe.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.35;
    controls.enableDamping = true;

    // Вращение — только вступительная заставка. Как только пользователь
    // хоть раз коснулся глобуса, оно должно остаться выключенным навсегда,
    // иначе цель под курсором "уезжает" при попытке кликнуть маркер/кластер.
    const stopAutoRotate = () => {
      controls.autoRotate = false;
    };
    container.addEventListener("pointerdown", stopAutoRotate, { once: true });
    container.addEventListener("wheel", stopAutoRotate, { once: true });
    return () => {
      container.removeEventListener("pointerdown", stopAutoRotate);
      container.removeEventListener("wheel", stopAutoRotate);
    };
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe || !ready || !selectedNodeId) return;
    globe.controls().autoRotate = false;
  }, [selectedNodeId, ready]);

  useEffect(() => {
    if (!selectedNodeId) return;
    const node = locatedNodes.find((n) => n.id === selectedNodeId);
    const globe = globeRef.current;
    if (!node || !globe) return;
    globe.pointOfView(
      { lat: node.coordinates.lat, lng: node.coordinates.lon, altitude: Math.min(altitude, 0.6) },
      900
    );
  }, [selectedNodeId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
      <Globe
        ref={globeRef}
        width={size.width}
        height={size.height}
        globeImageUrl={GLOBE_TEXTURE}
        bumpImageUrl={BUMP_TEXTURE}
        backgroundColor="#f7f5ef"
        showAtmosphere
        atmosphereColor="#c9972b"
        atmosphereAltitude={0.16}
        onGlobeReady={() => setReady(true)}
        onZoom={(pov) => setAltitude(pov.altitude)}
        htmlElementsData={points}
        htmlLat="lat"
        htmlLng="lng"
        htmlAltitude={0.01}
        htmlElement={(d) =>
          d.isCluster ? makeClusterElement(d, handleClusterClick) : makeLeafElement(d, onSelectNode)
        }
      />
    </div>
  );
}
