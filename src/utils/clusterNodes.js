// Простая grid-кластеризация уже спроецированных точек (x/y в пикселях
// viewBox карты). Размер ячейки зависит от текущего масштаба (scale) —
// чем ближе зум, тем мельче ячейка в мировых координатах, поэтому при
// приближении кластеры сами рассыпаются на отдельные узлы.
function cellSizeForScale(scale) {
  const px = 70 / scale;
  return Math.min(70, Math.max(4, px));
}

export function clusterNodes(points, scale) {
  const cell = cellSizeForScale(scale);
  const buckets = new Map();

  for (const point of points) {
    const key = `${Math.floor(point.x / cell)}:${Math.floor(point.y / cell)}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(point);
  }

  const result = [];
  for (const bucket of buckets.values()) {
    if (bucket.length === 1) {
      const { node, x, y } = bucket[0];
      result.push({ isCluster: false, id: node.id, x, y, node });
    } else {
      const x = bucket.reduce((s, p) => s + p.x, 0) / bucket.length;
      const y = bucket.reduce((s, p) => s + p.y, 0) / bucket.length;
      result.push({
        isCluster: true,
        id: `cluster:${x.toFixed(1)}:${y.toFixed(1)}:${bucket.length}`,
        x,
        y,
        count: bucket.length,
        childNodes: bucket.map((p) => p.node),
      });
    }
  }
  return result;
}
