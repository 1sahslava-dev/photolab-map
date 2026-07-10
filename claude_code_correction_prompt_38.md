Персональные ссылки на посты Telegram для PL-001–003 уже добавлены в данные. Нужно проверить и запушить — код не менять.

## Что изменено

`data/master.xlsx`, лист «03_Lessons_Map», колонка «Ссылка на урок (Telegram)»:

- PL-001: `https://t.me/photolab_vf` → `https://t.me/photolab_vf/39`
- PL-002: `https://t.me/photolab_vf` → `https://t.me/photolab_vf/45`
- PL-003: `https://t.me/photolab_vf` → `https://t.me/photolab_vf/50`

PL-004–007 не трогали — там пока общая ссылка на канал, обновим, когда пришлю ссылки на посты.

`src/data/data.json` уже пересобран из master.xlsx (`python3 scripts/convert.py` выполнен) — пересобирать заново не нужно, только проверить.

## Что нужно сделать

1. `git status` — должны быть изменены только `data/master.xlsx` и `src/data/data.json`, никакого кода.
2. `npm run dev`, открой Journey Mode на PL-001, PL-002, PL-003 — кнопка «Читать урок в Telegram» должна вести на конкретный пост (не на главную канала).
3. `npm run build` — проверь, что сборка проходит без ошибок.
4. Закоммить и запушь в `1sahslava-dev/photolab-map`. Автодеплой на Vercel настроен, вручную `vercel --prod` не нужно.

## Что не менять

- Любой код (`src/**/*.jsx`, `src/**/*.css`, `scripts/convert.py`)
- Ссылки для PL-004–007 и остальных уроков — там правильно оставить как есть
