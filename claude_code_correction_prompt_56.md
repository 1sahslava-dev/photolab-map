Добавлена кнопка входа в приложение PLVF рядом с кнопкой Telegram. Данные не менялись — только код.

## Что изменено

`src/components/NodeCard.jsx`:
- Новый компонент `PlvfAppLink` со ссылкой на `https://photolab-app.vercel.app` (URL зашит константой `PLVF_APP_URL` прямо в компоненте — это отдельное приложение, общее для всего курса, а не per-lesson ссылка из xlsx, как `telegramUrl`).
- В обеих карточках (Journey Mode и Explore Mode) `TelegramLink` и `PlvfAppLink` теперь рендерятся вместе, обёрнутые в `<div className="node-card-links">`.

`src/App.css`:
- `.node-card-plvf:hover` — золотой акцент (`--gold`) вместо Telegram Blue у обычной ссылки.
- `.node-card-links` — flex-ряд с переносом (`flex-wrap: wrap`) и отступом снизу; margin-bottom перенесён с самой ссылки на обёртку, чтобы кнопки красиво стояли в один ряд и на мобильном переносились друг под друга, если не помещаются.

## Что нужно сделать

1. `git status` — должны быть изменены только `src/components/NodeCard.jsx` и `src/App.css`.
2. `npm run dev`:
   - Journey Mode: на любом шаге под текстом должны стоять рядом две кнопки — «Читать урок в Telegram» и «Открыть в приложении PLVF» (золотая иконка-плей).
   - Explore Mode: то же самое в карточке узла (если у узла заполнен `telegramUrl` — кнопки должны стоять рядом; если `telegramUrl` пуст — должна остаться только кнопка PLVF, без пустого места от Telegram).
   - Проверь на узком экране (мобильная ширина) — кнопки должны переноситься на новую строку, а не вылезать за карточку.
   - Клик по «Открыть в приложении PLVF» открывает `https://photolab-app.vercel.app` в новой вкладке.
3. `npm run build` — сборка без ошибок.
4. Закоммить и запушь в `1sahslava-dev/photolab-map`. Автодеплой на Vercel настроен, вручную `vercel --prod` не нужно.

## Что не менять

- Данные (`data/master.xlsx`, `src/data/data.json`) — не трогались.
- Логика `TelegramLink` и её URL из `data.lessons[].telegramUrl` — не менялась, просто теперь стоит в общей обёртке с новой кнопкой.
