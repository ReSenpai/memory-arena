# Memory Arena — План разработки (TDD)

Каждый чекпоинт — это рабочее состояние проекта, которое можно запустить и проверить.
Подход: **Red -> Green -> Refactor** на каждом шаге.

---

## Checkpoint 0: Инициализация проекта
- [ ] Инициализировать Vite + React + TypeScript
- [ ] Настроить strict mode в tsconfig
- [ ] Установить и настроить Vitest
- [ ] Создать структуру папок (domain/, game/, store/, ui/, __tests__/)
- [ ] Написать первый smoke-тест: `expect(true).toBe(true)`
- [ ] Убедиться, что `npm test` и `npm run dev` работают

**Результат:** пустой проект, тесты запускаются, dev-сервер стартует.

---

## Checkpoint 1: Типы и модель памяти
- [ ] Создать `src/domain/types.ts` с типами `MemoryBlock`, `AllocationRequest`, `FreeRequest`
- [ ] Тест: типы корректно описывают структуру (компиляция = тест)

**Результат:** типовая система — фундамент для всего domain-слоя.

---

## Checkpoint 2: MemoryManager — allocate
- [ ] **RED:** Тест — `MemoryManager` создаётся с заданным размером памяти
- [ ] **GREEN:** Реализовать конструктор `MemoryManager(totalSize)`
- [ ] **RED:** Тест — `allocate(size)` возвращает блок с правильным start и size
- [ ] **GREEN:** Реализовать `allocate` (First Fit)
- [ ] **RED:** Тест — `allocate` при нехватке памяти возвращает `null`
- [ ] **GREEN:** Обработать edge case
- [ ] **REFACTOR:** Вынести First Fit в отдельный `Allocator.ts`

**Результат:** можно аллоцировать блоки памяти, стратегия выделена в отдельный модуль.

---

## Checkpoint 3: MemoryManager — free
- [ ] **RED:** Тест — `free(blockId)` переводит блок в состояние `'free'`
- [ ] **GREEN:** Реализовать `free`
- [ ] **RED:** Тест — `free` на уже свободном блоке выбрасывает ошибку (double free)
- [ ] **GREEN:** Обработать double free
- [ ] **RED:** Тест — `free` на несуществующем блоке выбрасывает ошибку
- [ ] **GREEN:** Обработать edge case

**Результат:** полный цикл allocate/free работает с обработкой ошибок.

---

## Checkpoint 4: Merge свободных блоков
- [ ] **RED:** Тест — два соседних свободных блока объединяются в один
- [ ] **GREEN:** Реализовать `mergeFreeBlocks()`
- [ ] **RED:** Тест — три подряд свободных блока объединяются
- [ ] **GREEN:** Обработать каскадное объединение
- [ ] **RED:** Тест — не объединяются, если между ними allocated блок
- [ ] **GREEN:** Проверить граничный случай

**Результат:** фрагментация уменьшается при освобождении.

---

## Checkpoint 5: Метрики и ErrorDetector
- [ ] **RED:** Тест — `getFragmentation()` возвращает 0 для пустой памяти
- [ ] **RED:** Тест — `getFragmentation()` считает правильно для фрагментированной памяти
- [ ] **GREEN:** Реализовать расчёт фрагментации
- [ ] **RED:** Тест — `ErrorDetector.checkLeak()` находит блоки, аллоцированные дольше N тиков
- [ ] **GREEN:** Реализовать детектор утечек

**Результат:** domain-слой полностью готов: allocate, free, merge, метрики, ошибки.

---

## Checkpoint 6: Scorer
- [ ] **RED:** Тест — начальный score = 0
- [ ] **RED:** Тест — успешный allocate даёт +N очков
- [ ] **RED:** Тест — leak снижает score
- [ ] **RED:** Тест — double free обнуляет stability
- [ ] **GREEN:** Реализовать `Scorer`

**Результат:** система оценки полностью тестируема и работает.

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
