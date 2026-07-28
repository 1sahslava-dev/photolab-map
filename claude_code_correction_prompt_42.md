Уроки переехали в новую группу Telegram (`photolab_vf_pro`) — все 7 ссылок на посты для PL-001–007 уже обновлены в данных. Нужно проверить и запушить, код не менять.

## Что изменено

`data/master.xlsx`, лист «03_Lessons_Map», колонка «Ссылка на урок (Telegram)» — старые ссылки на канал `photolab_vf` заменены на ссылки в новой группе `photolab_vf_pro`:

- PL-001: `https://t.me/photolab_vf/39` → `https://t.me/photolab_vf_pro/4/40`
- PL-002: `https://t.me/photolab_vf/45` → `https://t.me/photolab_vf_pro/4/54`
- PL-003: `https://t.me/photolab_vf/50` → `https://t.me/photolab_vf_pro/4/59`
- PL-004: `https://t.me/photolab_vf/55` → `https://t.me/photolab_vf_pro/4/64`
- PL-005: `https://t.me/photolab_vf/60` → `https://t.me/photolab_vf_pro/4/69`
- PL-006: `https://t.me/photolab_vf/65` → `https://t.me/photolab_vf_pro/4/75`
- PL-007: `https://t.me/photolab_vf` (общая) → `https://t.me/photolab_vf_pro/4/80`

PL-008 не трогали — он ещё не перевыложен в новую группу, там пока общая ссылка на старый канал (`https://t.me/photolab_vf`). Обновим, когда пришлют ссылку на пост в новой группе.

Остальные листы (`01_Master_Facts`, `02_Branches`, `04_Sources`) сверил построчно с предыдущей версией — изменений нет, только колонка ссылок в `03_Lessons_Map`.

`src/data/data.json` уже пересобран (`python3 scripts/convert.py` выполнен, `OK: 78 узлов`) — пересобирать заново не нужно, только проверить.

## Что нужно сделать

1. `git status` — должны быть изменены только `data/master.xlsx` и `src/data/data.json`, никакого кода.
2. `npm run dev`, открой Journey Mode на PL-001–007 по очереди — кнопка «Читать урок в Telegram» должна вести на пост в группе `photolab_vf_pro`, а не в старый канал `photolab_vf`.
3. `npm run build` — проверь, что сборка проходит без ошибок.
4. Закоммить и запушь в `1sahslava-dev/photolab-map`. Автодеплой на Vercel настроен, вручную `vercel --prod` не нужно.

## Что не менять

- Любой код (`src/**/*.jsx`, `src/**/*.css`, `scripts/convert.py`)
- Ссылку PL-008 — она обновится отдельно, когда придёт ссылка на пост в новой группе
