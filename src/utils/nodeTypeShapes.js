// Тип узла определяет форму маркера (независимо от ветки, которая даёт цвет).
// Одинаковая толщина линии (1.5-2px) для всех иконок — см. бренд-бук раздел 5.
const STROKE = 1.75;

function svg(inner, size = 22) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
}

export const NODE_TYPE_SHAPES = {
  "Фундаментальная предпосылка": (color) =>
    svg(`<circle cx="12" cy="12" r="8" stroke="${color}" stroke-width="${STROKE}" fill="none"/>`),
  "Технология / процесс": (color) =>
    svg(`<circle cx="12" cy="12" r="8" fill="${color}" stroke="${color}" stroke-width="${STROKE}"/>`),
  "Инструмент / устройство": (color) =>
    svg(`<rect x="5" y="5" width="14" height="14" stroke="${color}" stroke-width="${STROKE}" fill="none"/>`),
  "Публикация / объявление": (color) =>
    svg(`<rect x="12" y="3" width="12.7" height="12.7" transform="rotate(45 12 12)" stroke="${color}" stroke-width="${STROKE}" fill="none"/>`),
  "Терминология / язык": (color) =>
    svg(`<path d="M12 4 L20 18 L4 18 Z" stroke="${color}" stroke-width="${STROKE}" fill="none" stroke-linejoin="round"/>`),
  "Связь / переход": (color) =>
    svg(`<path d="M4 8 L20 8 M14 3 L20 8 L14 13" stroke="${color}" stroke-width="${STROKE}" fill="none" stroke-linecap="round" stroke-linejoin="round" transform="translate(0,4)"/>`),
  "Тиражирование / публикация": (color) =>
    svg(`<rect x="3" y="6" width="14" height="14" stroke="${color}" stroke-width="${STROKE}" fill="none"/><rect x="7" y="2" width="14" height="14" stroke="${color}" stroke-width="${STROKE}" fill="${'#F7F5EF'}"/>`),
  "Распространение / коммерциализация": (color) =>
    svg(`<path d="M12 3 L14.6 9.5 L21.5 10 L16.2 14.3 L18 21 L12 17.2 L6 21 L7.8 14.3 L2.5 10 L9.4 9.5 Z" stroke="${color}" stroke-width="${STROKE}" fill="none" stroke-linejoin="round"/>`),
  "Научное применение / пример": (color) =>
    svg(`<path d="M12 3 L20 8 V16 L12 21 L4 16 V8 Z" stroke="${color}" stroke-width="${STROKE}" fill="none" stroke-linejoin="round"/>`),
  "Применение / жанр": (color) =>
    svg(`<path d="M12 3 L21 9.5 L17.5 20 L6.5 20 L3 9.5 Z" stroke="${color}" stroke-width="${STROKE}" fill="none" stroke-linejoin="round"/>`),
  "Ключевой исторический узел": (color) =>
    svg(`<circle cx="12" cy="12" r="9" stroke="${color}" stroke-width="${STROKE}" fill="none"/><circle cx="12" cy="12" r="4" fill="${color}"/>`),
};

export function shapeSvg(nodeType, color) {
  const fn = NODE_TYPE_SHAPES[nodeType];
  if (!fn) {
    // Пробел в данных: неизвестный тип узла — показываем нейтральный маркер,
    // а не выдумываем форму.
    return svg(`<circle cx="12" cy="12" r="7" stroke="${color}" stroke-width="${STROKE}" stroke-dasharray="2 2" fill="none"/>`);
  }
  return fn(color);
}
