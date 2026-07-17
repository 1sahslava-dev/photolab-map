#!/usr/bin/env python3
"""
Конвертер PHOTO_LAB_History_Map_Master_*.xlsx -> src/data/data.json

Запуск: python3 scripts/convert.py [путь_к_xlsx]
По умолчанию читает data/master.xlsx (положите туда новую версию мастер-файла
и запустите скрипт заново — код менять не нужно).
"""
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_INPUT = ROOT / "data" / "master.xlsx"
OUTPUT = ROOT / "src" / "data" / "data.json"

# Цвета веток закреплены за названием ветки (не за позицией в списке), подобраны
# и провалидированы по методике dataviz-skill (OKLCH lightness/chroma/CVD ΔE,
# см. описание в README). Порядок — как в листе 02_Branches мастер-файла.
BRANCH_COLORS = {
    "Оптика / камера-обскура": "#1f7dcf",
    "Оптические инструменты": "#009ca5",
    "Фотохимия": "#9b7e00",
    "Гелиография": "#bc8900",
    "Дагеротип": "#089ac3",
    "Фотогенный рисунок / фотограмма": "#438f31",
    "Негатив-позитив": "#00724c",
    "Фиксаж / терминология": "#8059bb",
    "Печать / тиражирование": "#ba2d1f",
    "Мокрый коллодий": "#c13a46",
    "Уникальный позитив": "#006995",
    "Цвет": "#ae539d",
    "Проекция / распространение": "#00988a",
}

COORD_RE = re.compile(r"^\s*(-?\d+(?:[.,]\d+)?)\s*,\s*(-?\d+(?:[.,]\d+)?)\s*$")
YEAR_RE = re.compile(r"(\d{4})(-?[еxх])?")

# Курс рассчитан на 100 уроков (правка 40, было — жёсткий диапазон PL-001–007).
# Проверяем только уроки, которые реально есть в данных, а не все 100 заранее —
# иначе на каждый ещё не написанный урок сыпался бы ложный warning.
MAX_LESSON_NUMBER = 100
LESSON_ID_RE = re.compile(r"^PL-(\d{3})$")


def parse_coords(raw):
    if not raw:
        return None
    m = COORD_RE.match(str(raw))
    if not m:
        return None
    lat = float(m.group(1).replace(",", "."))
    lon = float(m.group(2).replace(",", "."))
    return {"lat": lat, "lon": lon}


def parse_date_range(raw):
    """Извлекает год(ы) из строки даты для сортировки/позиционирования на
    временной шкале. Не заменяет исходный текст даты — он всегда хранится
    рядом как dateLabel."""
    if not raw:
        return None, None
    text = str(raw)
    matches = YEAR_RE.findall(text)
    if not matches:
        return None, None
    years = []
    for year_str, decade_suffix in matches:
        year = int(year_str)
        if decade_suffix:
            years.append((year, year + 9))
        else:
            years.append((year, year))
    start = min(y[0] for y in years)
    end = max(y[1] for y in years)
    return start, end


def split_tags(raw):
    if not raw:
        return []
    return [t.strip() for t in str(raw).split("#") if t.strip()]


def sheet_rows(ws):
    rows = list(ws.iter_rows(values_only=True))
    header = [str(h).strip() if h is not None else "" for h in rows[0]]
    return header, rows[1:]


def col(header, name):
    return header.index(name)


def convert(input_path: Path):
    wb = openpyxl.load_workbook(input_path, data_only=True)

    # ---- 02_Branches ----
    header, rows = sheet_rows(wb["02_Branches"])
    i_name = col(header, "Ветка")
    i_includes = col(header, "Что включает")
    i_lessons = col(header, "Для каких уроков")
    i_colorname = col(header, "Визуальный цвет/код")
    i_comment = col(header, "Комментарий")

    branches = []
    missing_colors = []
    for r in rows:
        if not r[i_name]:
            continue
        name = r[i_name]
        hexcode = BRANCH_COLORS.get(name)
        if hexcode is None:
            missing_colors.append(name)
        branches.append({
            "name": name,
            "includes": r[i_includes],
            "lessons": r[i_lessons],
            "colorName": r[i_colorname],
            "colorHex": hexcode,
            "comment": r[i_comment],
        })

    if missing_colors:
        # Явно показываем пробел, а не выдумываем цвет.
        print(
            "ВНИМАНИЕ: для веток без назначенного hex-цвета нужно решение автора "
            f"(добавить цвет в BRANCH_COLORS в scripts/convert.py): {missing_colors}",
            file=sys.stderr,
        )

    # ---- 04_Sources ----
    header, rows = sheet_rows(wb["04_Sources"])
    i_id = col(header, "Источник ID")
    i_sname = col(header, "Название")
    i_url = col(header, "URL")
    i_usedfor = col(header, "Используется для")
    i_note = col(header, "Примечание")
    sources = {}
    for r in rows:
        if not r[i_id]:
            continue
        sources[r[i_id]] = {
            "id": r[i_id],
            "name": r[i_sname],
            "url": r[i_url],
            "usedFor": r[i_usedfor],
            "note": r[i_note],
        }

    # ---- 03_Lessons_Map (нарративная, не для строгой фильтрации) ----
    header, rows = sheet_rows(wb["03_Lessons_Map"])
    i_lid = col(header, "Урок")
    i_topic = col(header, "Главная тема")
    i_nodes_narrative = col(header, "Исторические узлы")
    i_understand = col(header, "Что должен понять новичок")
    i_status = col(header, "Статус")
    i_telegram = col(header, "Ссылка на урок (Telegram)")
    lessons = []
    for r in rows:
        if not r[i_lid]:
            continue
        lessons.append({
            "id": r[i_lid],
            "topic": r[i_topic],
            "nodesNarrative": r[i_nodes_narrative],
            "whatToUnderstand": r[i_understand],
            "status": r[i_status],
            "telegramUrl": r[i_telegram],
        })

    # ---- 01_Master_Facts ----
    header, rows = sheet_rows(wb["01_Master_Facts"])
    idx = {name: col(header, name) for name in [
        "ID", "Период / дата", "Точность даты", "Страна", "Город / регион",
        "Персона / группа", "Событие", "Ветка развития", "Технология / процесс",
        "Что изменилось", "Предыдущая связь", "Следующая связь", "Статус ветки",
        "Важность 1–5", "Привязка к уроку", "Источник ID", "Название источника",
        "URL источника", "Уверенность 1–5", "Комментарий для лекции",
        "Визуальная идея для карты", "Теги", "Проверить позже",
        "Координаты (lat, lon)", "Подветка (детали)", "Тип узла",
        "Флагман урока (да/нет)",
    ]}

    nodes = []
    for r in rows:
        if not r[idx["ID"]]:
            continue
        branch_name = r[idx["Ветка развития"]]
        date_start, date_end = parse_date_range(r[idx["Период / дата"]])
        nodes.append({
            "id": r[idx["ID"]],
            "dateLabel": r[idx["Период / дата"]],
            "dateAccuracy": r[idx["Точность даты"]],
            "dateSortStart": date_start,
            "dateSortEnd": date_end,
            "country": r[idx["Страна"]],
            "city": r[idx["Город / регион"]],
            "person": r[idx["Персона / группа"]],
            "event": r[idx["Событие"]],
            "branch": branch_name,
            "branchColor": BRANCH_COLORS.get(branch_name),
            "technology": r[idx["Технология / процесс"]],
            "whatChanged": r[idx["Что изменилось"]],
            "prevLink": r[idx["Предыдущая связь"]],
            "nextLink": r[idx["Следующая связь"]],
            "branchStatus": r[idx["Статус ветки"]],
            "importance": r[idx["Важность 1–5"]],
            "lessonLink": r[idx["Привязка к уроку"]],
            "sourceId": r[idx["Источник ID"]],
            "sourceName": r[idx["Название источника"]],
            "sourceUrl": r[idx["URL источника"]],
            "confidence": r[idx["Уверенность 1–5"]],
            "lectureComment": r[idx["Комментарий для лекции"]],
            "mapVisualIdea": r[idx["Визуальная идея для карты"]],
            "tags": split_tags(r[idx["Теги"]]),
            "checkLater": r[idx["Проверить позже"]] or None,
            "coordinates": parse_coords(r[idx["Координаты (lat, lon)"]]),
            "subBranch": r[idx["Подветка (детали)"]],
            "nodeType": r[idx["Тип узла"]],
            "flagship": str(r[idx["Флагман урока (да/нет)"]] or "").strip().lower() == "да",
        })

    # Journey Mode строит маршрут строго из этих узлов — если разметка в xlsx
    # неполная, лучше сообщить сразу, а не молча показать неполный/пустой маршрут.
    # Правка 40: курс расширен до 100 уроков, но проверяем и включаем в маршрут
    # только уроки, которые реально присутствуют среди флагманов на данный
    # момент (не все 100 наперёд — большинство ещё не написаны).
    flagship_nodes = [n for n in nodes if n["flagship"]]
    flagship_by_lesson = {}
    for n in flagship_nodes:
        flagship_by_lesson.setdefault(n["lessonLink"], []).append(n["id"])

    present_lessons = sorted(
        lesson for lesson in flagship_by_lesson if LESSON_ID_RE.match(lesson or "")
    )
    for lesson in present_lessons:
        num = int(LESSON_ID_RE.match(lesson).group(1))
        if num > MAX_LESSON_NUMBER:
            print(
                f"ВНИМАНИЕ: {lesson} превышает ожидаемый максимум PL-{MAX_LESSON_NUMBER:03d}",
                file=sys.stderr,
            )
        ids = flagship_by_lesson[lesson]
        if len(ids) != 1:
            print(
                f"ВНИМАНИЕ: для {lesson} найдено {len(ids)} узлов с «Флагман урока» = да "
                f"(ожидался ровно 1): {ids}",
                file=sys.stderr,
            )
    stray_lessons = {
        lesson for lesson in flagship_by_lesson if not LESSON_ID_RE.match(lesson or "")
    }
    if stray_lessons:
        print(
            f"ВНИМАНИЕ: флагманские узлы с неожиданной/некорректной привязкой к уроку "
            f"(ожидался формат PL-XXX): {stray_lessons}",
            file=sys.stderr,
        )

    filters = {
        "lessons": sorted({n["lessonLink"] for n in nodes if n["lessonLink"]}),
        "branches": sorted({n["branch"] for n in nodes if n["branch"]}),
        "nodeTypes": sorted({n["nodeType"] for n in nodes if n["nodeType"]}),
        "countries": sorted({n["country"] for n in nodes if n["country"]}),
    }

    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sourceFile": input_path.name,
        "branches": branches,
        "sources": sources,
        "lessons": lessons,
        "filters": filters,
        "nodes": nodes,
        "journeyNodeIds": [
            flagship_by_lesson[lesson][0] for lesson in present_lessons
        ],
        "nodesWithoutCoordinates": [n["id"] for n in nodes if n["coordinates"] is None],
    }


def main():
    input_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_INPUT
    if not input_path.exists():
        print(f"Файл не найден: {input_path}", file=sys.stderr)
        sys.exit(1)

    result = convert(input_path)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"OK: {len(result['nodes'])} узлов -> {OUTPUT.relative_to(ROOT)}")
    print(f"Без координат: {len(result['nodesWithoutCoordinates'])} -> {result['nodesWithoutCoordinates']}")


if __name__ == "__main__":
    main()
