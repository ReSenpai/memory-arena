# Memory Arena — симулятор управления оперативной памятью

## Стек

- **Language:** TypeScript (strict mode)
- **UI Framework:** React 18
- **State:** Zustand
- **Rendering:** Canvas 2D API (позже можно PixiJS)
- **Game loop:** `requestAnimationFrame`
- **Testing:** Vitest
- **Build:** Vite

---

## 1. Концепция

Игрок — диспетчер оперативной памяти. Программы присылают запросы на выделение/освобождение памяти. Игрок управляет этим вручную: выбирает куда аллоцировать, когда освобождать, как бороться с фрагментацией.

**Цель:** дать интуитивное понимание malloc/free, фрагментации и ошибок работы с памятью через геймплей.

---

## 2. Core Gameplay Loop

1. Поступает запрос: `Program C requests 24 bytes`
2. Игрок выбирает блок свободной памяти и выделяет регион
3. Через время: `Program C calls free(ptr)` — игрок освобождает
4. Ошибки (leak, double free, fragmentation) снижают стабильность
5. Система оценивает: эффективность, стабильность, скорость

---

## 3. Режим MVP — Manual Mode (C-like)

- Игрок вручную вызывает `allocate` и `free`
- Может объединять свободные блоки (merge)
- Возможные ошибки: memory leak, double free, fragmentation
- Стратегия аллокации: First Fit (позже Best Fit, Worst Fit)

---

## 4. Memory Model

```ts
type MemoryBlock = {
  id: string
  start: number       // адрес начала
  size: number         // размер в "ячейках"
  state: 'free' | 'allocated'
  programId?: string   // какая программа владеет
}
```

Вся память — линейный массив фиксированного размера, разбитый на блоки.

---

## 5. Failure States

| Ошибка | Условие | Эффект |
|--------|---------|--------|
| Memory Leak | Блок не освобождён вовремя | Память заканчивается |
| Fragmentation | Нет contiguous блока нужного размера | Отказ в аллокации |
| Double Free | Освобождение уже свободного блока | Crash (game over) |

---

## 6. UI

- **Центр:** визуализация памяти — горизонтальная полоса из цветных сегментов (Canvas)
- **Справа:** лог запросов (очередь)
- **Слева:** статистика (free memory, fragmentation %, stability, score)

---

## 7. Прогрессия (5 уровней)

1. Фиксированные блоки, только allocate/free
2. Случайные размеры, ограниченное время
3. Несколько программ одновременно
4. Штраф за фрагментацию
5. Вредоносные паттерны (adversarial programs)

---

## 8. Scoring

Очки за: низкую фрагментацию, отсутствие утечек, отсутствие crash, скорость реакции.

---

## 9. Архитектура

```
src/
├── domain/              <- Чистая логика, 0 зависимостей, 100% тестируемая
│   ├── MemoryManager.ts     — управление блоками (allocate, free, merge)
│   ├── Allocator.ts         — стратегии (FirstFit, BestFit)
│   ├── Scorer.ts            — подсчёт очков и метрик
│   ├── ErrorDetector.ts     — обнаружение leak/double-free/fragmentation
│   └── types.ts             — все типы и интерфейсы
│
├── game/                <- Оркестрация игры
│   ├── GameLoop.ts          — requestAnimationFrame loop
│   ├── LevelManager.ts      — конфигурация уровней, прогрессия
│   ├── RequestGenerator.ts  — генерация запросов от "программ"
│   └── GameSession.ts       — состояние текущей сессии
│
├── store/               <- Zustand store
│   └── gameStore.ts         — единый store, связывает domain и UI
│
├── ui/                  <- React-компоненты
│   ├── App.tsx
│   ├── MemoryCanvas.tsx     — Canvas-рендер памяти
│   ├── RequestQueue.tsx     — очередь запросов
│   ├── StatsPanel.tsx       — статистика
│   └── GameControls.tsx     — кнопки управления
│
└── __tests__/           <- Тесты (зеркалят структуру src/)
    ├── domain/
    └── game/
```

### Ключевые принципы архитектуры

1. **Domain — чистый TypeScript.** Никакого React, Zustand, Canvas. Только логика и типы. Ядро тестируется на 100% unit-тестами.

2. **Game — оркестратор.** Связывает domain-логику с временем (game loop), генерирует события. Тестируемый с моками для времени.

3. **Store — тонкий клей.** Zustand store вызывает методы domain/game и хранит состояние для React. Минимум логики.

4. **UI — тупые компоненты.** Берут данные из store, рендерят, вызывают actions. Без бизнес-логики.

---

## 10. Будущее (вне MVP)

- GC Mode (Mark & Sweep, Reference Counting)
- Rust-like Safe Mode (ownership/borrowing)
- Random events (spike load, corruption)
- Skill tree / unlock progression
- Dynamic difficulty
