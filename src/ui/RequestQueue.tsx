import { useGameStore } from '../store/gameStore'

/** Очередь запросов — список pending-запросов с кнопками действий */
export function RequestQueue() {
  const pendingRequests = useGameStore((s) => s.pendingRequests)
  const allocate = useGameStore((s) => s.allocate)
  const free = useGameStore((s) => s.free)
  const sessionState = useGameStore((s) => s.sessionState)

  if (sessionState === 'idle') {
    return (
      <div className="request-queue">
        <h2>Запросы</h2>
        <p className="queue-empty">Нажмите «Старт» чтобы начать</p>
      </div>
    )
  }

  return (
    <div className="request-queue">
      <h2>Запросы ({pendingRequests.length})</h2>

      {pendingRequests.length === 0 && (
        <p className="queue-empty">Нет активных запросов</p>
      )}

      <ul className="request-list">
        {pendingRequests.map((req) => (
          <li
            key={req.payload.id}
            className={`request-item request-${req.type}`}
          >
            <div className="request-info">
              <span className="request-type">
                {req.type === 'allocate' ? 'ALLOC' : 'FREE'}
              </span>
              <span className="request-details">
                {req.type === 'allocate'
                  ? `${req.payload.size} ячеек — ${req.payload.programId}`
                  : `блок ${req.payload.blockId} — ${req.payload.programId}`}
              </span>
            </div>
            <button
              className="request-action"
              onClick={() =>
                req.type === 'allocate'
                  ? allocate(req.payload.id)
                  : free(req.payload.id)
              }
            >
              {req.type === 'allocate' ? 'Выделить' : 'Освободить'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
