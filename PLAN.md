# Memory Arena v3 — Phaser Migration Plan (TDD)

Миграция: React + Canvas 2D → **Phaser 3** game engine.
Drag & drop (зажатие мыши) вместо кликов. Генерируемые текстуры и звуки.
Видимые указатели на блоках. Подход: **Red → Green → Refactor**.

---

## Что переиспользуем

| Модуль | Статус | Примечание |
|--------|--------|------------|
| `domain/*` (6 файлов) | ✅ оставляем | Чистая логика, 0 зависимостей от UI |
| `game/GameSession.ts` | ✅ оставляем | Фасад — тот же API |
| `game/LevelManager.ts` | ✅ оставляем | 5 уровней |
| `game/RequestGenerator.ts` | ✅ оставляем | Генерация запросов |
| `game/SeededRandom.ts` | ✅ оставляем | Детерминированный RNG |
| `__tests__/domain/*` (6 файлов) | ✅ оставляем | 82 теста |
| `__tests__/game/*` (3 файла) | ✅ оставляем | 32 теста (без GameLoop) |
| `__tests__/smoke.test.ts` | ✅ оставляем | 1 тест |
| `.github/workflows/deploy.yml` | ✅ оставляем | CI/CD |
| Vite + TypeScript + Vitest + ESLint + Prettier | ✅ оставляем | Инфра |

## Что удаляем

| Модуль | Причина |
|--------|---------|
| `react`, `react-dom`, `zustand` | Заменяет Phaser |
| `@vitejs/plugin-react`, `@types/react*`, `eslint-plugin-react-hooks` | Больше не нужны |
| `src/store/gameStore.ts` | Zustand → Phaser event bus |
| `src/ui/*` (10 файлов) | React → Phaser scenes |
| `src/main.tsx` | → `src/main.ts` (Phaser.Game) |
| `__tests__/store/gameStore.test.ts` | Store удалён |
| `src/game/GameLoop.ts` + тест | Phaser имеет свой game loop |

## Что добавляем

| Модуль | Назначение |
|--------|------------|
| `phaser` | Игровой движок |
| `src/main.ts` | Точка входа: Phaser.Game config |
| `src/scenes/BootScene.ts` | Загрузка ассетов (генерация текстур + звуков) |
| `src/scenes/GameScene.ts` | Основная сцена: grid + HUD + drag & drop |
| `src/assets/TextureGenerator.ts` | Генерация всех текстур через Phaser Graphics |
| `src/assets/SoundGenerator.ts` | Генерация звуков через Web Audio API |

---

## Решение проблемы указателей

Проблема: FREE-карточка говорит `free 0x0042`, но непонятно какой блок это.

Решение:
1. **Указатель на блоке** — каждый allocated блок на сетке отображает свой pointer (`0xXXXX`) как текст внутри ячеек.
2. **Подсветка при drag** — когда игрок начинает перетаскивать FREE-карточку, целевой блок на сетке **пульсирует** ярким свечением + показывает соединительную линию.
3. **Цветовая связь** — FREE-карточка и целевой блок имеют одинаковый цветовой акцент.
4. **Pointer loss** — если указатель потерян, подсветка НЕ появляется. Игрок должен найти блок вручную по имени процесса.

---

## Drag & Drop механика

### ALLOC (размещение блока)
1. Игрок **зажимает** ALLOC-карточку в очереди
2. **Ghost-фигура** появляется и следует за курсором
3. При наведении на сетку — превью (зелёный = можно, красный = нельзя)
4. Клавиша **R** вращает фигуру во время перетаскивания
5. **Отпускание** на валидной позиции → размещение блока
6. **Отпускание** вне сетки → отмена

### FREE (освобождение блока)
1. Игрок **зажимает** FREE-карточку
2. Целевой блок на сетке **пульсирует** (если pointer не потерян)
3. Игрок перетаскивает FREE-карточку на пульсирующий блок
4. **Отпускание** на правильном блоке → освобождение
5. **Отпускание** на неправильном / вне сетки → отмена

### Garbage (дефрагментация)
1. Игрок **зажимает** garbage-блок на сетке
2. Блок следует за курсором
3. **Отпускание** на пустой ячейке → перемещение
4. **Отпускание** на занятой / вне сетки → возврат на место

---

## Генерируемые ассеты

### Текстуры (Phaser Graphics → generateTexture)

| Ключ | Описание | Размер |
|------|----------|--------|
| `cell-free` | Тёмная ячейка с тонкой рамкой | 32×32 |
| `cell-alloc-{0..7}` | 8 цветов процессов | 32×32 |
| `cell-garbage` | Коричневая ячейка с диагональным паттерном | 32×32 |
| `cell-ghost-ok` | Зелёный полупрозрачный | 32×32 |
| `cell-ghost-bad` | Красный полупрозрачный | 32×32 |
| `cell-highlight` | Ярко-зелёная пульсирующая рамка | 32×32 |
| `particle-white` | Белая частица 4×4 для эффектов | 4×4 |

### Звуки (Web Audio oscillator → ArrayBuffer)

| Ключ | Описание | Параметры |
|------|----------|-----------|
| `sfx-place` | Размещение блока | sine 440→880, 120ms |
| `sfx-free` | Освобождение | sine 660→330, 150ms |
| `sfx-error` | Ошибка / неверный drop | square 200Hz, 200ms |
| `sfx-garbage` | Конвертация в мусор | sawtooth 100→50, 300ms |
| `sfx-tick` | Тик таймера | sine 1000Hz, 30ms |
| `sfx-win` | Победа | C-E-G-C арпеджио, 500ms |
| `sfx-lose` | Поражение | G-E-C нисходящее, 400ms |
| `sfx-drag` | Начало перетаскивания | sine 500Hz, 50ms |

---

## Чекпоинты

### CP0: Инфраструктура
- [ ] Установить `phaser`
- [ ] Удалить `react`, `react-dom`, `zustand`, `@vitejs/plugin-react`, `@types/react*`, `eslint-plugin-react-hooks`
- [ ] Обновить `vite.config.ts` (убрать react plugin)
- [ ] Обновить `tsconfig.json` (убрать `jsx`)
- [ ] Обновить `index.html` (убрать `<div id="root">`, подключить `src/main.ts`)
- [ ] Создать `src/main.ts` — Phaser.Game config (Scale.RESIZE, transparent bg)
- [ ] Создать пустые `src/scenes/BootScene.ts`, `src/scenes/GameScene.ts`
- [ ] Удалить `src/ui/*`, `src/store/*`, `src/__tests__/store/*`
- [ ] Удалить `src/game/GameLoop.ts`, `src/__tests__/game/GameLoop.test.ts`
- [ ] Обновить `eslint.config.js` (убрать react-hooks plugin)
- [ ] `pnpm test` — 115 тестов проходят
- [ ] `pnpm run build` — собирается

### CP1: Генерация ассетов
- [ ] `src/assets/TextureGenerator.ts` — все текстуры из таблицы
- [ ] `src/assets/SoundGenerator.ts` — все звуки из таблицы
- [ ] BootScene вызывает генераторы → переход к GameScene
- [ ] `pnpm run build` — собирается

### CP2: GameScene — сетка
- [ ] Создать GameSession, нарисовать grid из спрайтов
- [ ] Центрирование сетки, resize handler
- [ ] Sync спрайтов с snapshot (free/alloc/garbage ячейки)
- [ ] `pnpm run build` — собирается

### CP3: Блоки с указателями
- [ ] Allocated ячейки → цвет процесса + текст pointer (0xXXXX)
- [ ] Garbage ячейки → текстура cell-garbage
- [ ] Hover → показать имя процесса
- [ ] `pnpm run build` — собирается

### CP4: Очередь запросов (HUD)
- [ ] Панель внизу: горизонтальный ряд карточек
- [ ] ALLOC: синий акцент, процесс + размер
- [ ] FREE: оранжевый акцент, pointer + deadline progress bar
- [ ] Urgent-пульс для FREE < 30% времени
- [ ] `pnpm run build` — собирается

### CP5: Drag & Drop — ALLOC
- [ ] ALLOC-карточка → draggable
- [ ] Ghost-фигура следует за курсором, snap к сетке
- [ ] Превью canPlace → зелёный / красный ghost
- [ ] R → вращение ghost
- [ ] Drop на валидной позиции → placeBlock() + sfx-place
- [ ] Drop вне → отмена
- [ ] `pnpm run build` — собирается

### CP6: Drag & Drop — FREE + подсветка указателей
- [ ] FREE-карточка → draggable
- [ ] dragstart: resolvePointer → подсветить целевой блок (tween пульсация)
- [ ] Соединительная линия от карточки к блоку
- [ ] Drop на правильном блоке → freeBlock() + sfx-free
- [ ] Drop на неправильном → sfx-error + отмена
- [ ] Pointer loss — нет подсветки, игрок ищет вручную
- [ ] `pnpm run build` — собирается

### CP7: Drag & Drop — Garbage
- [ ] Garbage-спрайты → draggable
- [ ] Drag: блок поднимается + shadow
- [ ] Drop на пустую ячейку → moveGarbage()
- [ ] Drop на занятую → возврат
- [ ] `pnpm run build` — собирается

### CP8: Stats bar + игровой цикл
- [ ] Панель сверху: уровень, счёт/цель, stability bar, тик
- [ ] Phaser time.addEvent для тиков (500ms)
- [ ] Каждый тик → session.tick() → обновить grid + queue + stats
- [ ] Кнопки Start / Pause / Resume
- [ ] Win/Lose условия → overlay
- [ ] `pnpm run build` — собирается

### CP9: Анимации и звуки
- [ ] Place: белая вспышка (tween alpha 1→0)
- [ ] Free: dissolve (scale 1→0 + alpha 1→0)
- [ ] Garbage conversion: красный pulse
- [ ] Звуки на все события
- [ ] Particle эффекты (place, free)
- [ ] `pnpm run build` — собирается

### CP10: Overlays
- [ ] Start screen: заголовок + Start + level select
- [ ] Game Over: win/lose, счёт, retry / next level
- [ ] Help: правила игры
- [ ] `pnpm run build` — собирается

### CP11: Polish & Deploy
- [ ] Responsive (Phaser Scale.RESIZE)
- [ ] Проверить все 5 уровней
- [ ] `pnpm run lint` — чисто
- [ ] `pnpm test` — зелёные
- [ ] `pnpm run build` — ок
- [ ] README.md — обновить
- [ ] Деплой

---

## Карта зависимостей

```
CP0 (инфраструктура)
 └─► CP1 (ассеты)
      └─► CP2 (сетка)
           └─► CP3 (блоки + указатели)
                ├─► CP4 (HUD очередь)
                │    └─► CP5 (drag ALLOC)
                │         └─► CP6 (drag FREE + подсветка)
                │              └─► CP7 (drag Garbage)
                │                   └─► CP8 (stats + tick loop)
                │                        └─► CP9 (анимации + звуки)
                │                             └─► CP10 (overlays)
                │                                  └─► CP11 (polish)
```
