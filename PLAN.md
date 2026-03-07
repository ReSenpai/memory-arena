# Memory Arena v2 — План редизайна (TDD)

Редизайн: линейная память → grid-доска, drag & drop, фигурные блоки, garbage/дефрагментация.
Подход: **Red → Green → Refactor** на каждом шаге.

---

## Что переиспользуем из v1

| Модуль | Статус | Примечание |
|--------|--------|------------|
| Vite + React + TS + Vitest + ESLint + Prettier | ✅ оставляем | Инфра не меняется |
| `SeededRandom` | ✅ оставляем | Детерминированный рандом — тот же |
| `GameLoop` | ✅ оставляем | rAF + tick accumulator — тот же |
| Zustand store паттерн | ✅ адаптируем | Паттерн `syncFromSession` — тот же, содержимое меняется |
| CSS тема / палитра | ✅ адаптируем | Тёмная тема та же, layout другой |
| `GameOverlay` | ✅ адаптируем | Структура та же, условия win/lose меняются |
| `ErrorNotification` | ✅ оставляем | Тот же тост |
| `.github/workflows/deploy.yml` | ✅ оставляем | CI/CD тот же |

## Что удаляем / переписываем полностью

| Модуль | Причина |
|--------|---------|
| `domain/types.ts` | Новая модель: grid cells, shapes, pointers, processes |
| `domain/MemoryManager.ts` | Линейный allocator → `MemoryGrid` (2D) |
| `domain/Allocator.ts` | Стратегии не нужны — игрок сам размещает |
| `domain/ErrorDetector.ts` | Логика утечек другая (таймер на free, pointer loss) |
| `domain/Scorer.ts` | Новая формула очков (size×10, дефраг бонус и т.д.) |
| `game/types.ts` | Новые `LevelConfig` (grid size, target score) |
| `game/GameSession.ts` | Новый фасад с grid + pointers + garbage |
| `game/RequestGenerator.ts` | Генерирует shaped-блоки + pointer loss события |
| `game/LevelManager.ts` | 5 уровней с grid-размерами и target score |
| `store/gameStore.ts` | Новые actions (place, rotate, drag, free-by-pointer) |
| `ui/App.tsx` | Новый layout (stats сверху, grid центр, queue внизу) |
| `ui/MemoryCanvas.tsx` | Grid-рендер вместо линейного + drag & drop |
| `ui/RequestQueue.tsx` | Горизонтальная очередь внизу + drag free карточек |
| `ui/StatsPanel.tsx` | Горизонтальная панель сверху |
| `ui/GameControls.tsx` | Адаптация под новый layout |
| `ui/HelpModal.tsx` | Новый контент — grid, фигуры, garbage, дефрагментация |
| Все тесты | Переписываем под новые типы и логику |

---

## Checkpoint 0: Очистка и подготовка
- [ ] Удалить старые domain/ файлы (types, MemoryManager, Allocator, ErrorDetector, Scorer)
- [ ] Удалить старые game/ файлы (types, GameSession, RequestGenerator, LevelManager)
- [ ] Удалить все тесты из `__tests__/domain/` и `__tests__/game/` и `__tests__/store/`
- [ ] Оставить: `SeededRandom.ts`, `GameLoop.ts`, smoke-тест
- [ ] Очистить `gameStore.ts` до пустого шаблона
- [ ] Очистить UI компоненты до заглушек
- [ ] `pnpm test` и `pnpm run lint` проходят на пустом проекте

**Результат:** чистый проект с работающей инфрой, готов к новому domain-слою.

---

## Checkpoint 1: Новые типы и модель данных
- [ ] `domain/types.ts` — новые типы:
  - `Cell` — ячейка grid (`{ row, col }`)
  - `Shape` — фигура блока (массив `Cell[]` — относительные координаты)
  - `BlockId`, `Pointer` (branded string, hex вида `0xA3F2`)
  - `ProcessName` — строка (`Chrome`, `Firefox`, `VSCode` и т.д.)
  - `AllocatedBlock` — `{ id, pointer, process, shape, cells, placedAt }` (cells — абсолютные координаты на grid)
  - `GarbageBlock` — `{ id, shape, cells }` (можно двигать)
  - `AllocateRequest` — `{ id, process, pointer, shape, createdAtTick }`
  - `FreeRequest` — `{ id, pointer, deadline, createdAtTick }` (deadline = тик, после которого block → garbage)
  - `GameRequest` — tagged union allocate | free
  - `GridMetrics` — `{ totalCells, usedCells, freeCells, garbageCells, fragmentation }`
- [ ] Тесты: типы компилируются, можно создать экземпляры

**Результат:** полная типовая система v2.

---

## Checkpoint 2: Shapes — фигуры блоков
- [ ] `domain/Shapes.ts`:
  - Предопределённые фигуры: линия-2, линия-3, линия-4, L-форма, T-форма, квадрат 2×2, Z-форма
  - `rotateShape(shape, times)` — поворот на 90° × times
  - `normalizeShape(shape)` — сдвинуть к (0,0)
  - `getShapeBounds(shape)` — ширина/высота
- [ ] Тесты: поворот, нормализация, bounds для каждой фигуры
- [ ] Набор фигур по уровням: Level 1 — простые (линии), Level 4-5 — сложные (L, T, Z)

**Результат:** система фигур с поворотами, покрыта тестами.

---

## Checkpoint 3: MemoryGrid — 2D доска
- [ ] `domain/MemoryGrid.ts`:
  - Конструктор: `new MemoryGrid(rows, cols)` — пустая сетка
  - `canPlace(shape, row, col)` — проверка: все ячейки внутри bounds и свободны
  - `place(block)` — разместить allocated block на grid (записать id в ячейки)
  - `remove(blockId)` — освободить ячейки блока
  - `moveGarbage(garbageId, newRow, newCol)` — переместить garbage блок
  - `getCell(row, col)` — состояние ячейки (`null` | blockId | garbageId)
  - `getMetrics()` — `GridMetrics`
  - `getSnapshot()` — копия состояния grid для рендера
- [ ] Тесты: place, remove, canPlace (коллизии, out of bounds), moveGarbage, metrics

**Результат:** 2D memory grid, полностью тестируемый, 0 зависимостей.

---

## Checkpoint 4: PointerRegistry — реестр указателей
- [ ] `domain/PointerRegistry.ts`:
  - `generatePointer()` — уникальный hex pointer (`0xA3F2`)
  - `register(pointer, blockId)` — связать pointer с block
  - `resolve(pointer)` — получить blockId по pointer
  - `unregister(pointer)` — удалить связь
  - `losePointer(pointer)` — пометить pointer как lost (block → garbage)
  - `getAll()` — все зарегистрированные пары
- [ ] Тесты: генерация, регистрация, resolve, unregister, lose

**Результат:** система указателей, имитирующая реальные pointer'ы в куче.

---

## Checkpoint 5: Scorer v2 — новая формула очков
- [ ] `domain/Scorer.ts` (переписать):
  - `onAllocate(size)` → `+size × 10`
  - `onFree()` → `+10`
  - `onDefragMove()` → `+5` (бонус за дефрагментацию)
  - `onQuickAction(ticksSinceRequest)` → бонус за скорость
  - `onMissedFree()` → `−20`
  - `onWrongFree()` → `−5`
  - `onFragmentationPenalty(fragmentation)` → постепенный штраф
  - `onQueueOverflow()` → штраф стабильности
  - Стабильность: 0–1, утечки снижают на 0.1
- [ ] Тесты: все сценарии начисления/штрафов

**Результат:** система очков v2.

---

## Checkpoint 6: RequestGenerator v2 — фигурные запросы
- [ ] `game/types.ts` — новый `LevelConfig`:
  - `gridRows`, `gridCols` (вместо `memorySize`)
  - `targetScore` (вместо `targetTicks`)
  - `availableShapes` — какие фигуры доступны на уровне
  - `requestInterval`, `freeDeadlineTicks`
  - `pointerLossChance` (0 для Level 1-2, >0 для Level 3+)
  - `maxQueueSize`
  - `processNames[]`
- [ ] `game/LevelManager.ts` — 5 уровней:
  - Level 1: 8×8, простые формы, 500 очков
  - Level 2: 10×10, больше процессов, 1000 очков
  - Level 3: 12×12, pointer loss, 2000 очков
  - Level 4: 16×16, сложные фигуры, 3000 очков
  - Level 5: 20×20, хаос, 5000 очков
- [ ] `game/RequestGenerator.ts` (переписать):
  - Генерирует `AllocateRequest` с shape из `availableShapes`
  - Генерирует `FreeRequest` с deadline
  - Случайный pointer loss (с шансом `pointerLossChance`)
  - Учитывает `maxQueueSize`
- [ ] Тесты: генерация запросов, pointer loss, deadlines, конфигурация уровней

**Результат:** генератор запросов v2 с фигурами, deadlines и pointer loss.

---

## Checkpoint 7: GarbageManager — управление утечками
- [ ] `domain/GarbageManager.ts`:
  - `convertToGarbage(block)` — allocated block → garbage block (pointer теряется)
  - `checkExpiredFrees(freeRequests, currentTick)` — возвращает список блоков, чей deadline истёк
  - `handlePointerLoss(pointer, registry, grid)` — block → garbage, pointer → lost
  - `getGarbageBlocks()` — все garbage блоки
- [ ] Тесты: конвертация, expired frees, pointer loss

**Результат:** менеджер garbage блоков.

---

## Checkpoint 8: GameSession v2 — новый фасад
- [ ] `game/GameSession.ts` (переписать):
  - Управляет: `MemoryGrid`, `PointerRegistry`, `RequestGenerator`, `Scorer`, `GarbageManager`
  - State machine: idle → playing ↔ paused → finished
  - **`tick()`**: генерация запросов, проверка deadlines, проверка win (score ≥ targetScore) / lose (stability ≤ 0), фрагментация штраф
  - **`placeBlock(requestId, row, col, rotation)`**: взять allocate request → повернуть фигуру → проверить canPlace → разместить
  - **`freeBlock(freeRequestId, targetBlockId)`**: проверить pointer совпадение → remove block → unregister pointer
  - **`moveGarbage(garbageId, newRow, newCol)`**: перемещение garbage блока на grid
  - **`rotatePreview(requestId)`**: показать превью фигуры повёрнутой
  - **`getSnapshot()`**: полное состояние для UI
- [ ] `SessionSnapshot` v2: grid data, allocated blocks, garbage blocks, pending requests, score, stability, процессы, queue
- [ ] Тесты: tick, placeBlock (success/collision), freeBlock (match/mismatch), moveGarbage, win/lose, deadlines

**Результат:** полностью рабочая игровая сессия v2, покрыта тестами.

---

## Checkpoint 9: Zustand Store v2
- [ ] `store/gameStore.ts` (переписать):
  - State: grid snapshot, blocks, garbage, requests, score, stability, queue, processes, selectedRequest, dragState
  - Actions:
    - `startGame(levelId)`, `doTick()`, `pause()`, `resume()`
    - `selectRequest(requestId)` — выбрать запрос из очереди
    - `placeBlock(row, col, rotation)` — разместить выбранный allocate
    - `freeBlock(freeRequestId, blockId)` — применить free
    - `moveGarbage(garbageId, row, col)` — переместить garbage
    - `rotateSelected()` — повернуть выбранную фигуру
    - `nextLevel()`, `clearError()`
  - `syncFromSession()` — паттерн из v1
- [ ] Тесты: все actions, sync, start/stop lifecycle

**Результат:** store, связывающий game → UI.

---

## Checkpoint 10: Базовый UI Layout
- [ ] Новый layout `App.tsx`:

```
+----------------------------------+
| Score | Stability | Processes    |  ← StatsBar (горизонтальный, сверху)
+----------------------------------+
|                                  |
|          MEMORY GRID             |  ← GridCanvas (центр, основная область)
|                                  |
+----------------------------------+
| [alloc][alloc][free][alloc]      |  ← RequestQueue (горизонтальный, внизу)
+----------------------------------+
```

- [ ] `StatsBar.tsx` — горизонтальная панель: score, stability bar, активные процессы, уровень
- [ ] `RequestQueue.tsx` — горизонтальная очередь запросов внизу
- [ ] `GameControls.tsx` — адаптировать под новый layout (в StatsBar или отдельно)
- [ ] `App.css` — полностью новый layout (сохранить тёмную палитру)
- [ ] Заглушки для GridCanvas

**Результат:** рабочий layout с заглушками, theme в тон v1.

---

## Checkpoint 11: GridCanvas — отрисовка grid-доски
- [ ] `ui/GridCanvas.tsx`:
  - Canvas 2D рендер grid'а (сетка линий)
  - Отрисовка allocated блоков (цвет по процессу)
  - Отрисовка garbage блоков (другой цвет/паттерн)
  - Отрисовка свободных ячеек
  - Hover-подсветка ячейки
  - DPR-aware, ResizeObserver
  - Легенда цветов
- [ ] Тест: компонент рендерится без ошибок

**Результат:** рабочая визуализация grid-доски.

---

## Checkpoint 12: Drag & Drop — размещение блоков
- [ ] Drag allocate-запросов из очереди на grid:
  - Клик по запросу в очереди → выделение + превью фигуры
  - Наведение на grid → ghost-превью фигуры (зелёный если можно, красный если нельзя)
  - Клик на grid → разместить (если `canPlace`)
  - Клавиша `R` → поворот фигуры на 90°
- [ ] Drag free-запросов на блоки:
  - Клик по free-запросу → подсветить matching block (по pointer)
  - Клик на matching block → free
  - Неверный блок → ошибка "pointer mismatch"
- [ ] Drag garbage блоков:
  - Клик на garbage → выделить
  - Клик на свободное место → переместить
  - `R` → повернуть garbage

**Результат:** полная drag & drop механика.

---

## Checkpoint 13: Free Timers + Garbage конвертация
- [ ] Визуальный таймер на free-запросах в очереди (progress bar / обратный отсчёт)
- [ ] По истечении deadline: free исчезает, block → garbage, штраф (анимация)
- [ ] Pointer loss событие: уведомление «⚠ pointer lost», block → garbage
- [ ] Анимация конвертации block → garbage (смена цвета, пульсация)
- [ ] Queue overflow: если очередь > `maxQueueSize` → штраф стабильности

**Результат:** полный цикл утечек памяти.

---

## Checkpoint 14: Полный игровой цикл
- [ ] `useGameLoop` подключен
- [ ] Tick → генерация → размещение → free → garbage → score check
- [ ] Win: score ≥ targetScore → GameOverlay + next level
- [ ] Lose: stability ≤ 0 → GameOverlay + restart
- [ ] Прогрессия: Level 1→5
- [ ] GameOverlay адаптирован
- [ ] ErrorNotification работает
- [ ] Всё интегрировано, играбельно от начала до конца

**Результат:** полностью играбельная игра v2.

---

## Checkpoint 15: HelpModal v2 + README
- [ ] `HelpModal.tsx` — новый контент:
  - Grid-доска и ячейки (вместо линейной памяти)
  - Фигурные блоки и поворот (R)
  - Drag & drop механика (allocate, free, garbage)
  - Pointer'ы и их потеря
  - Garbage блоки и дефрагментация
  - Таблица ошибок и штрафов (v2)
  - Описание 5 уровней (v2)
  - Советы
- [ ] README.md — обновить описание, скриншоты

**Результат:** полная документация v2.

---

## Checkpoint 16: Polish и финальная шлифовка
- [ ] Анимации: размещение блока (flash), free (исчезновение), garbage конвертация
- [ ] Звуковые эффекты (опционально)
- [ ] Responsive layout (мобильный, планшет)
- [ ] Скроллбар в тон темы
- [ ] Проверить все 5 уровней вручную
- [ ] `pnpm run lint` — чисто
- [ ] `pnpm test` — все тесты зелёные
- [ ] `pnpm run build` — собирается
- [ ] Деплой на GitHub Pages работает

**Результат:** готовый к публикации MVP v2.

---

## Порядок работы на каждом шаге

```
1. Пишем ТЕСТ (Red)     — описываем ожидаемое поведение
2. Запускаем — тест ПАДАЕТ (подтверждаем что тест валиден)
3. Пишем МИНИМАЛЬНЫЙ код (Green) — чтобы тест прошёл
4. Запускаем — тест ПРОХОДИТ
5. Рефакторим (Refactor) — улучшаем код, тесты всё ещё зелёные
6. Коммитим
```

---

## Карта зависимостей между чекпоинтами

```
CP0 (очистка)
 └─► CP1 (типы)
      ├─► CP2 (shapes)
      ├─► CP4 (pointers)
      └─► CP5 (scorer)
           │
CP2 ──────►CP3 (grid)
           │
CP3 + CP4 ─► CP7 (garbage)
              │
CP5 + CP6 + CP7 ─► CP8 (session)
                     │
                     ├─► CP9 (store)
                     │    └─► CP10 (layout)
                     │         └─► CP11 (grid canvas)
                     │              └─► CP12 (drag & drop)
                     │                   └─► CP13 (timers + garbage UI)
                     │                        └─► CP14 (full loop)
                     │                             └─► CP15 (help + readme)
                     │                                  └─► CP16 (polish)
```
