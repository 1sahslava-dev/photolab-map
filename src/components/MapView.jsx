import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import { shapeSvg } from "../utils/nodeTypeShapes";

const DARK_TILES = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILES_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

function makeIcon(node) {
  const html = shapeSvg(node.nodeType, node.branchColor || "#c9972b");
  return L.divIcon({
    html,
    className: "plm-marker-icon",
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -11],
  });
}

export default function MapView({ nodes, onSelectNode, selectedNodeId }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const clusterRef = useRef(null);
  const markersRef = useRef(new Map());

  useEffect(() => {
    if (mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [30, 15],
      zoom: 3,
      minZoom: 2,
      worldCopyJump: true,
    });
    L.tileLayer(DARK_TILES, {
      attribution: TILES_ATTRIBUTION,
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    const cluster = L.markerClusterGroup({
      maxClusterRadius: 42,
      iconCreateFunction: (c) => {
        const count = c.getChildCount();
        const size = count < 5 ? 32 : count < 15 ? 40 : 48;
        return L.divIcon({
          html: `<div class="plm-cluster-icon" style="width:${size}px;height:${size}px">${count}</div>`,
          className: "",
          iconSize: [size, size],
        });
      },
    });
    map.addLayer(cluster);

    mapRef.current = map;
    clusterRef.current = cluster;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const cluster = clusterRef.current;
    if (!cluster) return;
    cluster.clearLayers();
    markersRef.current.clear();

    nodes
      .filter((n) => n.coordinates)
      .forEach((node) => {
        const marker = L.marker([node.coordinates.lat, node.coordinates.lon], {
          icon: makeIcon(node),
        });
        marker.on("click", () => onSelectNode(node.id));
        marker.bindTooltip(
          `<strong>${node.event.slice(0, 60)}${node.event.length > 60 ? "…" : ""}</strong><br/>${node.dateLabel} · ${node.branch}`,
          { direction: "top", opacity: 0.95 }
        );
        markersRef.current.set(node.id, marker);
        cluster.addLayer(marker);
      });
  }, [nodes, onSelectNode]);

  useEffect(() => {
    if (!selectedNodeId) return;
    const marker = markersRef.current.get(selectedNodeId);
    const map = mapRef.current;
    if (marker && map) {
      map.setView(marker.getLatLng(), Math.max(map.getZoom(), 5), { animate: true });
      marker.openTooltip();
    }
  }, [selectedNodeId]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
