# Memory Arena — План разработки (TDD)

Каждый чекпоинт — это рабочее состояние проекта, которое можно запустить и проверить.
Подход: **Red -> Green -> Refactor** на каждом шаге.

---

## Checkpoint 0: Инициализация проекта ✅
- [x] Инициализировать Vite + React + TypeScript
- [x] Настроить strict mode в tsconfig
- [x] Установить и настроить Vitest
- [x] Создать структуру папок (domain/, game/, store/, ui/, __tests__/)
- [x] Написать первый smoke-тест: `expect(true).toBe(true)`
- [x] Убедиться, что `pnpm test` и `pnpm dev` работают
- [x] Добавить ESLint 9 + Prettier

**Результат:** пустой проект, тесты запускаются, dev-сервер стартует, lint/format работают.

---

## Checkpoint 1: Типы и модель памяти ✅
- [x] Создать `src/domain/types.ts` с типами `MemoryBlock`, `AllocationRequest`, `FreeRequest`
- [x] Добавлены `AllocationResult`, `FreeResult` (discriminated unions с причиной ошибки)
- [x] Добавлены `MemoryRequest` (tagged union), `MemoryMetrics`
- [x] Компиляция + lint проходят

**Результат:** типовая система — фундамент для всего domain-слоя.

---

## Checkpoint 2: MemoryManager — allocate &#x2705;
- [x] **RED:** Тест — `MemoryManager` создаётся с заданным размером памяти
- [x] **GREEN:** Реализовать конструктор `MemoryManager(totalSize)`
- [x] **RED:** Тест — `allocate(size)` возвращает блок с правильным start и size
- [x] **GREEN:** Реализовать `allocate` (First Fit)
- [x] **RED:** Тест — `allocate` при нехватке памяти возвращает `{ success: false, reason: 'no-fit' }`
- [x] **GREEN:** Обработать edge case (уже работало)
- [x] **REFACTOR:** Вынести First Fit в отдельный `Allocator.ts` (интерфейс `AllocatorStrategy`)

**Результат:** можно аллоцировать блоки памяти, стратегия выделена в отдельный модуль.

---

## Checkpoint 3: MemoryManager — free &#x2705;
- [x] **RED:** Тест — `free(blockId)` переводит блок в состояние `'free'`
- [x] **GREEN:** Реализовать `free`
- [x] **RED:** Тест — `free` на уже свободном блоке возвращает `{ success: false, reason: 'double-free' }`
- [x] **GREEN:** Обработать double free
- [x] **RED:** Тест — `free` на несуществующем блоке возвращает `{ success: false, reason: 'not-found' }`
- [x] **GREEN:** Обработать edge case

**Результат:** полный цикл allocate/free работает с обработкой ошибок.

---

## Checkpoint 4: Merge свободных блоков &#x2705;
- [x] **RED:** Тест — два соседних свободных блока объединяются в один
- [x] **RED:** Тест — три подряд свободных блока объединяются (каскад)
- [x] **RED:** Тест — не объединяются, если между ними allocated блок
- [x] **RED:** Тест — частичное слияние (только соседние free, allocated остаётся)
- [x] **GREEN:** Реализовать `mergeFreeBlocks()` — цикл while с каскадным объединением

**Результат:** фрагментация уменьшается при освобождении.

---

## Checkpoint 5: Метрики и ErrorDetector &#x2705;
- [x] **RED:** Тест — `getMetrics()` возвращает корректные метрики для пустой памяти
- [x] **RED:** Тест — `getMetrics()` считает usedSize/freeSize после аллокации
- [x] **RED:** Тест — фрагментация считается по формуле `1 - maxFree/totalFree`
- [x] **RED:** Тест — фрагментация = 0 при одном свободном блоке
- [x] **GREEN:** Реализовать `getMetrics(): MemoryMetrics`
- [x] **RED:** Тесты — `detectLeaks()` находит/не находит утечки по порогу тиков
- [x] **GREEN:** Реализовать `detectLeaks()` как чистую функцию
- [x] Добавлено поле `allocatedAtTick` в `MemoryBlock`

**Результат:** domain-слой полностью готов: allocate, free, merge, метрики, ошибки.

---

## Checkpoint 6: Scorer ✅
- [x] **RED:** Тест — начальный score = 0, stability = 1
- [x] **RED:** Тест — успешный allocate даёт +10 за ячейку, free +5
- [x] **RED:** Тест — leak снижает score на 20 и stability на 0.1
- [x] **RED:** Тест — double free обнуляет stability, −50 очков
- [x] **RED:** Тест — getSummary() возвращает текущие значения
- [x] **GREEN:** Реализовать `Scorer` как класс с методами-событиями

**Результат:** система оценки полностью тестируема и работает (11 тестов).

---

## Checkpoint 7: RequestGenerator и LevelManager
- [ ] **RED:** Тест — `RequestGenerator` генерирует запросы с заданной частотой
- [ ] **GREEN:** Реализовать генератор с seed-based random (детерминированный для тестов)
- [ ] **RED:** Тест — `LevelManager` возвращает конфиг уровня (memorySize, requestRate, etc.)
- [ ] **GREEN:** Реализовать конфиги для 5 уровней

**Результат:** game-слой может генерировать запросы и управлять сложностью.

---

## Checkpoint 8: GameSession
- [ ] **RED:** Тест — `GameSession` связывает MemoryManager + RequestGenerator + Scorer
- [ ] **GREEN:** Реализовать GameSession как фасад
- [ ] **RED:** Тест — `session.tick()` продвигает время, генерирует запросы
- [ ] **GREEN:** Реализовать tick-based обновление
- [ ] **RED:** Тест — `session.allocate()` / `session.free()` обновляют состояние и score
- [ ] **GREEN:** Реализовать player actions

**Результат:** вся игровая логика работает без UI, чисто через тесты.

---

## Checkpoint 9: GameLoop
- [ ] Реализовать `GameLoop` с `requestAnimationFrame`
- [ ] Добавить pause/resume
- [ ] Тест (с мок-таймером): loop вызывает `session.tick()` с правильным dt

**Результат:** игра может "тикать" в реальном времени.

---

## Checkpoint 10: Zustand Store
- [ ] Создать `gameStore` с состоянием: blocks, requests, score, level, gameState
- [ ] Actions: startGame, allocate, free, tick, pause, resume
- [ ] Тест: actions корректно обновляют состояние

**Результат:** store связывает domain/game с будущим UI.

---

## Checkpoint 11: Базовый UI — Layout
- [ ] Создать `App.tsx` с тремя панелями (stats, memory, requests)
- [ ] StatsPanel показывает: score, free memory, fragmentation %
- [ ] RequestQueue показывает список запросов
- [ ] GameControls: кнопки Start, Pause

**Результат:** каркас UI отображает данные из store.

---

## Checkpoint 12: MemoryCanvas — визуализация памяти
- [ ] Canvas рендерит блоки памяти как цветные прямоугольники
- [ ] Зелёный = free, цветной = allocated (цвет по programId)
- [ ] Клик по блоку — выделение/действие

**Результат:** память визуально отображается и интерактивна.

---

## Checkpoint 13: Полный игровой цикл
- [ ] Связать UI + Store + GameLoop
- [ ] Запрос появляется → игрок кликает по free блоку → allocate
- [ ] Запрос на free → игрок кликает по allocated блоку → free
- [ ] Ошибки отображаются визуально

**Результат:** ИГРАБЕЛЬНЫЙ MVP — можно проходить уровень 1.

---

## Checkpoint 14: Уровни 2-5
- [ ] Реализовать переход между уровнями
- [ ] Level 2: случайные размеры + таймер
- [ ] Level 3: несколько программ
- [ ] Level 4: fragmentation penalty
- [ ] Level 5: adversarial patterns
- [ ] Экран победы / game over

**Результат:** полная игра с 5 уровнями.

---

## Checkpoint 15: Polish
- [ ] Анимации (подсветка ошибок, плавное появление блоков)
- [ ] Звуковые эффекты (опционально)
- [ ] Responsive layout
- [ ] README для пользователей

**Результат:** готовый к публикации MVP.

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
