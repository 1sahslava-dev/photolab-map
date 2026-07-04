// Простая grid-кластеризация точек на глобусе. Размер ячейки зависит от
// текущей высоты камеры (altitude) — чем ближе камера, тем мельче ячейка,
// поэтому при приближении кластеры сами рассыпаются на отдельные узлы.
function cellSizeForAltitude(altitude) {
  const deg = altitude * 4;
  return Math.min(14, Math.max(0.8, deg));
}

export function clusterNodes(nodes, altitude) {
  const cell = cellSizeForAltitude(altitude);
  const buckets = new Map();

  for (const node of nodes) {
    const { lat, lon } = node.coordinates;
    const key = `${Math.floor(lat / cell)}:${Math.floor(lon / cell)}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(node);
  }

  const points = [];
  for (const bucketNodes of buckets.values()) {
    if (bucketNodes.length === 1) {
      const node = bucketNodes[0];
      points.push({
        isCluster: false,
        id: node.id,
        lat: node.coordinates.lat,
        lng: node.coordinates.lon,
        node,
      });
    } else {
      const lat = bucketNodes.reduce((s, n) => s + n.coordinates.lat, 0) / bucketNodes.length;
      const lng = bucketNodes.reduce((s, n) => s + n.coordinates.lon, 0) / bucketNodes.length;
      points.push({
        isCluster: true,
        id: `cluster:${lat.toFixed(2)}:${lng.toFixed(2)}:${bucketNodes.length}`,
        lat,
        lng,
        count: bucketNodes.length,
        childNodes: bucketNodes,
      });
    }
  }
  return points;
}
