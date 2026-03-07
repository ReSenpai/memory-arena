import { useGameStore } from '../store/gameStore'
import type { GameRequest } from '../domain/types'

/** Горизонтальная очередь запросов внизу экрана */
export function RequestQueue() {
  const pendingRequests = useGameStore((s) => s.pendingRequests)
  const selectedRequestId = useGameStore((s) => s.selectedRequestId)
  const selectRequest = useGameStore((s) => s.selectRequest)
  const currentTick = useGameStore((s) => s.currentTick)

  if (pendingRequests.length === 0) {
    return (
      <div className="request-queue-bar">
        <span className="queue-empty">Очередь пуста — ожидайте запросы</span>
      </div>
    )
  }

  return (
    <div className="request-queue-bar">
      {pendingRequests.map((req) => (
        <RequestCard
          key={req.payload.id}
          request={req}
          currentTick={currentTick}
          isSelected={selectedRequestId === req.payload.id}
          onSelect={() =>
            selectRequest(
              selectedRequestId === req.payload.id ? null : req.payload.id,
            )
          }
        />
      ))}
    </div>
  )
}

function RequestCard({
  request,
  currentTick,
  isSelected,
  onSelect,
}: {
  request: GameRequest
  currentTick: number
  isSelected: boolean
  onSelect: () => void
}) {
  const isAlloc = request.type === 'allocate'

  // Deadline progress for free requests
  let deadlinePct = 100
  let isUrgent = false
  if (!isAlloc) {
    const { deadline, createdAtTick } = request.payload
    const total = deadline - createdAtTick
    const remaining = deadline - currentTick
    deadlinePct = total > 0 ? Math.max(0, (remaining / total) * 100) : 0
    isUrgent = deadlinePct < 30
  }

  const className = [
    'request-card',
    isAlloc ? 'request-card-alloc' : 'request-card-free',
    isSelected ? 'request-card-selected' : '',
    isUrgent ? 'request-card-urgent' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button className={className} onClick={onSelect}>
      <span className="request-card-type">
        {isAlloc ? 'ALLOC' : 'FREE'}
      </span>
      <span className="request-card-detail">
        {isAlloc
          ? `${request.payload.process} (${request.payload.shape.length})`
          : request.payload.pointer}
      </span>
      {!isAlloc && (
        <div className="request-card-timer">
          <div
            className="request-card-timer-fill"
            style={{
              width: `${deadlinePct}%`,
              background: isUrgent ? '#f85149' : '#f0883e',
            }}
          />
        </div>
      )}
    </button>
  )
}
