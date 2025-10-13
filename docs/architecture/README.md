# Architecture

Short, stable anchors for humans (and agents). Keep changeable details in `notes.md` or ADRs.

- Related:
  - Instructions: `.github/copilot-instructions.md`
  - Agent Manifest: `../AGENT_MANIFEST.md`
  - Notebook: `./notes.md`
  - ADRs: `./decisions/`

## Scope and layering
- Purpose: metadata editor (Drafts/Schemas/Setups/Menu) with form and table experiences.
- Stack: Vite + React, TypeScript, Blueprint UI, AG Grid, RTK Query, Axios facade, AJV/JSON Forms.
- Layering:
  - UI: React components; renderers (JSON Forms/AG Grid).
  - State: RTK Query for server data; local component state and small contexts.
  - Data: `src/shared/api/**` (Axios facade); RTK Query endpoints in `src/store/api.ts` ([src/store/api.ts](src/store/api.ts)).
  - Schema resolution cache lives in API layer.
- Authority split: details про теги/інвалідації/обмеження — у Agent Manifest; цей документ описує як частини з’єднані.

## Path grammar (URL `?path=...`)
Управління UI відбувається через рядок шляху; він мапиться на рендерер і параметри.

- Граматика (сьогодні):
  - BasePath — послідовність заголовків, з’єднаних `/` (напр., `Game/Chests`).
  - Table view: `?path=<BasePath>` якщо `BasePath` позначено як `table`.
  - Form view (існуючий драфт): `?path=<BasePath>/<draftId>` якщо `BasePath` позначено як `form`.
  - New draft: `?path=<BasePath>/new` (зарезервований суфікс).
- Single source of truth (сьогодні):
  - Динамічна мапа маршрутів у коді задає `BasePath → { kind: 'form'|'table', schemaKey, uiSchema }`:
    - Див. [src/components/sidebar/menuStructure.tsx](src/components/sidebar/menuStructure.tsx).
  - `EntityHost` розв’язує `kind` і рендерить відповідно:
    - Див. [src/components/EntityHost.tsx](src/components/EntityHost.tsx).
  - Хелпери шляху: [src/core/pathTools.ts](src/core/pathTools.ts).
- Setup:
  - `setupId` обирається через контекст і не є частиною `path`. Дані беруться з комбінації `setupId` + `(schemaKey, draftId)` з шляху.
- Вже є: модальне створення сетапу (див. `src/components/CreateSetupModal.tsx`) — редагування сетапів/схем у майбутньому.
- На майбутнє:
  - Роутер і вкладки: адреса може еволюціонувати для підтримки багатовкладкового редагування (наприклад, `ChestDescriptor` і `NpcDescriptor` в окремих вкладках).
  - Рендер-хінт у UI-схемі: домовлений ключ `"x-host": { "renderer": "table" | "form" }`, щоб обійти хардкод у меню (див. ADR коли впроваджуватимемо).
  - Сторінки редагування схем/сетапів: напр., `?path=Schemas/<schemaKey>`, `?path=Setups/<setupId>` (зафіксувати остаточно в ADR).

Примітка: Раніше згадане “one GET per action” не застосовується. Коректна політика — уникати зайвих дублюючих запитів, але послідовні різні запити дозволені.

## Runtime overview
- Навігація: Sidebar синтезує динамічні вузли з мапи маршрутів і формує `?path=...`.
- Рендер:
  - `table` → AG Grid.
  - `form` → JSON Forms.
  - `new-draft` → drawer для створення (після — навігація до `/<newId>`).
- Дані та кеш:
  - RTK Query + Axios facade; стабільні теги та таргетована інвалідація (див. Manifest).
  - Ресолвер `schemaKey → schemaId` централізовано в API-шарі (in‑memory кеш).

## Schema resolver cache
- Обсяг: до ~200 записів; тримаємо в пам’яті протягом сесії.
- Ключ: `${setupId}:${schemaKey}` (сьогодні). Якщо колись `schemaId` стане глобально стабільним між сетапами — можна оптимізувати ключ.
- Інвалідація:
  - Зміна `setupId` — повний скидання кешу (безпечно за замовчуванням).
  - Інвалідація тегу `Schemas[setupId]` — вибірковий скидання для цього `setupId`.
- TTL: не потрібен (обсяг малий, контроль — через інвалідацію).

## Core flows
- Startup: провайдери монтуються → завантажуються Setups → сайдбар активний.
- Table: парсимо `?path` → маємо `{schemaKey}` → список драфтів → інлайн-редагування примітивів → debounce‑save → таргетована інвалідація.
- Form: парсимо `?path` → `{schemaKey, draftId}` → завантаження драфта → валідація → збереження → інвалідація.
- New draft: `?path=<BasePath>/new` → drawer → створити → інвалідація (Drafts + MenuItems, де доречно) → `?path=<BasePath>/<newId>`.

## Contracts and limits
- Вибір рендерера зараз задається мапою маршрутів (меню), івент-буса немає.
- Уникати дублюючих запитів; послідовні відмінні запити — ОК.
- Ресолвер схем — лише в API-шарі, щоб не утворювати циклів імпорту.
- Інлайн-редагування: тільки примітиви та неглибокі нормалізовані об’єкти; масиви/глибокі об’єкти — через drawer/form.

## Hot spots
- Цикли імпорту між фасадами/API і тулінгом.
- Надмірні інвалідації та зайві рефетчі — віддавати перевагу таргетованим тегам, для малих датасетів можна патчити кеш.
- Idempotency під StrictMode.
- Динамічні селекти в таблиці — потенційно потребуватимуть кастомних редакторів (див. TODO/ADR).

## File pointers
- Dynamic route map: `src/components/sidebar/menuStructure.tsx`
- Host/view selection: `src/components/EntityHost.tsx`
- RTKQ endpoints: `src/store/api.ts`
- Path helpers: `src/core/pathTools.ts`

## Glossary
- Draft — контентна сутність, прив’язана до схеми.
- Schema — JSON Schema опис структури контенту.
- Setup — робочий профіль/контекст.
- MenuItems — динамічні елементи меню, побудовані для схеми.
