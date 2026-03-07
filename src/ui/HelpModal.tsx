import { useState } from 'react'

export function HelpModal() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        className="btn-help"
        onClick={() => setOpen(true)}
        title="Правила игры"
      >
        ?
      </button>

      {open && (
        <div className="help-backdrop" onClick={() => setOpen(false)}>
          <div className="help-modal" onClick={(e) => e.stopPropagation()}>
            <div className="help-header">
              <h2>📖 Как играть</h2>
              <button
                className="help-close"
                onClick={() => setOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="help-body">
              <section className="help-section">
                <h3>🎯 Цель</h3>
                <p>
                  Управляйте памятью: размещайте блоки на grid-доске, 
                  освобождайте их по запросам и боритесь с фрагментацией. 
                  Наберите целевой счёт чтобы пройти уровень.
                </p>
              </section>

              <section className="help-section">
                <h3>📦 Запросы на выделение (ALLOC)</h3>
                <p>
                  Выберите ALLOC-карточку в очереди внизу, 
                  затем кликните на grid чтобы разместить блок. 
                  Каждый блок имеет фигуру (как в Тетрисе).
                </p>
                <p>
                  <strong>R</strong> — повернуть фигуру на 90°.
                  Зелёный призрак = можно разместить, красный = нельзя.
                </p>
              </section>

              <section className="help-section">
                <h3>🗑️ Запросы на освобождение (FREE)</h3>
                <p>
                  FREE-карточки содержат pointer (0xXXXX). 
                  Выберите карточку, затем кликните на блок с соответствующим pointer.
                  У FREE есть дедлайн — таймер внизу карточки.
                </p>
                <p>
                  Если не успеете — блок станет <strong>garbage</strong> (утечка памяти), 
                  а стабильность снизится.
                </p>
              </section>

              <section className="help-section">
                <h3>♻️ Дефрагментация</h3>
                <p>
                  Garbage-блоки (коричневые с диагональю) можно перемещать: 
                  кликните на garbage → кликните на свободное место. 
                  За каждый ход +5 очков.
                </p>
              </section>

              <section className="help-section">
                <h3>⚡ Pointer Loss (от Уровня 3)</h3>
                <p>
                  Случайно pointer может быть потерян. 
                  Блок сразу превращается в garbage, а стабильность падает.
                </p>
              </section>

              <section className="help-section">
                <h3>📊 Очки</h3>
                <table className="help-table">
                  <thead>
                    <tr><th>Действие</th><th>Очки</th></tr>
                  </thead>
                  <tbody>
                    <tr><td>Размещение блока</td><td>+size × 10</td></tr>
                    <tr><td>Освобождение</td><td>+10</td></tr>
                    <tr><td>Быстрое действие (≤3 тика)</td><td>+бонус</td></tr>
                    <tr><td>Дефрагментация</td><td>+5</td></tr>
                    <tr><td>Пропущенный free</td><td>−20, −10% стаб.</td></tr>
                    <tr><td>Неверный free</td><td>−5</td></tr>
                    <tr><td>Фрагментация</td><td>постепенный штраф</td></tr>
                  </tbody>
                </table>
              </section>

              <section className="help-section">
                <h3>🏆 Уровни</h3>
                <table className="help-table">
                  <thead>
                    <tr><th>Уровень</th><th>Grid</th><th>Цель</th><th>Особенности</th></tr>
                  </thead>
                  <tbody>
                    <tr><td>1</td><td>8×8</td><td>500</td><td>Простые фигуры</td></tr>
                    <tr><td>2</td><td>10×10</td><td>1000</td><td>Больше процессов</td></tr>
                    <tr><td>3</td><td>12×12</td><td>2000</td><td>Pointer loss</td></tr>
                    <tr><td>4</td><td>16×16</td><td>3000</td><td>Сложные фигуры</td></tr>
                    <tr><td>5</td><td>20×20</td><td>5000</td><td>Хаос</td></tr>
                  </tbody>
                </table>
              </section>

              <section className="help-section">
                <h3>💡 Советы</h3>
                <ul>
                  <li>Размещайте блоки компактно — фрагментация штрафует</li>
                  <li>Обрабатывайте FREE быстро — дедлайны реальны</li>
                  <li>Двигайте garbage к краям чтобы освободить центр</li>
                  <li>Следите за стабильностью — при 0% проигрыш</li>
                </ul>
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
