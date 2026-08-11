Ссылки на посты Telegram для PL-007–010 уже обновлены в master.xlsx (видимо, правили файл напрямую) — я пересобрал data.json из актуальной версии. Нужно проверить и запушить, код не менять.

## Что изменено

`data/master.xlsx`, лист «03_Lessons_Map», колонка «Ссылка на урок (Telegram)» — обновлены ссылки на новую группу `photolab_vf_pro`:

- PL-007: `https://t.me/photolab_vf_pro/4/80` → `https://t.me/photolab_vf_pro/4/105`
- PL-008: `https://t.me/photolab_vf` → `https://t.me/photolab_vf_pro/4/110`
- PL-009: `https://t.me/photolab_vf` → `https://t.me/photolab_vf_pro/4/118`
- PL-010: `https://t.me/photolab_vf` → `https://t.me/photolab_vf_pro/4/131`

PL-011 не трогали — там пока общая ссылка на канал, обновим, когда пришлют ссылку на пост.

Важно: эти правки в `master.xlsx` уже были в рабочей копии на диске (видимо, отредактированы вручную или другим инструментом), но `src/data/data.json` ещё не был пересобран под них — я запустил `python3 scripts/convert.py` (вывод: `OK: 109 узлов`, без warning), теперь data.json соответствует master.xlsx.

## Что нужно сделать

1. `git status` — должны быть изменены только `data/master.xlsx` и `src/data/data.json`, никакого кода.
2. `npm run dev`, открой Journey Mode на PL-007, 008, 009, 010 по очереди — кнопка «Читать урок в Telegram» должна вести на конкретный пост в группе `photolab_vf_pro`, а не в старый канал/устаревший пост.
3. `npm run build` — проверь, что сборка проходит без ошибок.
4. Закоммить и запушь в `1sahslava-dev/photolab-map`. Автодеплой на Vercel настроен, вручную `vercel --prod` не нужно.

## Что не менять

- Любой код (`src/**/*.jsx`, `src/**/*.css`, `scripts/convert.py`)
- Ссылку PL-011 — обновим отдельно, когда пришлют пост
