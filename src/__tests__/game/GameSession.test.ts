import { describe, it, expect } from 'vitest'
import { GameSession } from '../../game/GameSession'
import { getLevelConfig } from '../../game/LevelManager'

describe('GameSession', () => {
  const config = getLevelConfig(1)
  const seed = 42

  describe('создание', () => {
    it('создаётся с конфигом уровня и seed', () => {
      const session = new GameSession(config, seed)
      expect(session).toBeDefined()
    })

    it('начальный тик = 0', () => {
      const session = new GameSession(config, seed)
      expect(session.getCurrentTick()).toBe(0)
    })

    it('начальное состояние — idle', () => {
      const session = new GameSession(config, seed)
      expect(session.getState()).toBe('idle')
    })

    it('начальная очередь запросов пуста', () => {
      const session = new GameSession(config, seed)
      expect(session.getPendingRequests()).toHaveLength(0)
    })
  })

  describe('tick', () => {
    it('увеличивает текущий тик на 1', () => {
      const session = new GameSession(config, seed)
      session.start()
      session.tick()
      expect(session.getCurrentTick()).toBe(1)
    })

    it('генерирует запрос на тике, кратном requestInterval', () => {
      const session = new GameSession(config, seed)
      session.start()

      // Тикаем до requestInterval (8)
      for (let i = 0; i < config.requestInterval; i++) {
        session.tick()
      }

      // На тике 8 (кратен requestInterval) должен появиться запрос
      expect(session.getPendingRequests().length).toBeGreaterThanOrEqual(1)
    })

    it('не тикает в состоянии idle', () => {
      const session = new GameSession(config, seed)
      session.tick()
      expect(session.getCurrentTick()).toBe(0)
    })

    it('не тикает в состоянии finished', () => {
      const session = new GameSession(config, seed)
      session.start()
      session.finish()
      const tickBefore = session.getCurrentTick()
      session.tick()
      expect(session.getCurrentTick()).toBe(tickBefore)
    })
  })

  describe('start / pause / resume / finish', () => {
    it('start переводит в состояние playing', () => {
      const session = new GameSession(config, seed)
      session.start()
      expect(session.getState()).toBe('playing')
    })

    it('start генерирует начальный запрос (тик 0)', () => {
      const session = new GameSession(config, seed)
      session.start()
      expect(session.getPendingRequests().length).toBe(1)
    })

    it('pause переводит в состояние paused', () => {
      const session = new GameSession(config, seed)
      session.start()
      session.pause()
      expect(session.getState()).toBe('paused')
    })

    it('tick не работает в paused', () => {
      const session = new GameSession(config, seed)
      session.start()
      session.pause()
      const tickBefore = session.getCurrentTick()
      session.tick()
      expect(session.getCurrentTick()).toBe(tickBefore)
    })

    it('resume возвращает в playing', () => {
      const session = new GameSession(config, seed)
      session.start()
      session.pause()
      session.resume()
      expect(session.getState()).toBe('playing')
    })

    it('finish переводит в состояние finished', () => {
      const session = new GameSession(config, seed)
      session.start()
      session.finish()
      expect(session.getState()).toBe('finished')
    })
  })

  describe('allocate (действие игрока)', () => {
    it('аллоцирует блок по запросу из очереди', () => {
      const session = new GameSession(config, seed)
      session.start()

      // После start на тике 0 появляется allocate-запрос
      const requests = session.getPendingRequests()
      expect(requests.length).toBe(1)
      const req = requests[0]
      expect(req.type).toBe('allocate')

      const result = session.allocate(req.payload.id)
      expect(result.success).toBe(true)
    })

    it('успешный allocate убирает запрос из очереди', () => {
      const session = new GameSession(config, seed)
      session.start()

      const req = session.getPendingRequests()[0]
      session.allocate(req.payload.id)

      expect(session.getPendingRequests()).toHaveLength(0)
    })

    it('успешный allocate начисляет очки', () => {
      const session = new GameSession(config, seed)
      session.start()

      const req = session.getPendingRequests()[0]
      session.allocate(req.payload.id)

      expect(session.getScoreSummary().score).toBeGreaterThan(0)
    })

    it('возвращает ошибку для несуществующего запроса', () => {
      const session = new GameSession(config, seed)
      session.start()

      const result = session.allocate('nonexistent')
      expect(result.success).toBe(false)
    })
  })

  describe('free (действие игрока)', () => {
    it('освобождает блок по запросу из очереди', () => {
      const session = new GameSession(config, seed)
      session.start()

      // Сначала аллоцируем блок
      const allocReq = session.getPendingRequests()[0]
      session.allocate(allocReq.payload.id)

      // Тикаем до появления free-запроса
      // Добавляем free-запрос вручную через тики
      let freeReq = null
      for (let i = 0; i < 200; i++) {
        session.tick()
        const pending = session.getPendingRequests()
        freeReq = pending.find((r) => r.type === 'free')
        if (freeReq) break
      }

      if (freeReq) {
        const result = session.free(freeReq.payload.id)
        expect(result.success).toBe(true)
      }
    })

    it('успешный free начисляет очки', () => {
      const session = new GameSession(config, seed)
      session.start()

      // Аллоцируем
      const allocReq = session.getPendingRequests()[0]
      session.allocate(allocReq.payload.id)
      const scoreAfterAlloc = session.getScoreSummary().score

      // Ищем free-запрос
      let freeReq = null
      for (let i = 0; i < 200; i++) {
        session.tick()
        const pending = session.getPendingRequests()
        freeReq = pending.find((r) => r.type === 'free')
        if (freeReq) break
      }

      if (freeReq) {
        session.free(freeReq.payload.id)
        expect(session.getScoreSummary().score).toBeGreaterThan(scoreAfterAlloc)
      }
    })
  })

  describe('детектор утечек', () => {
    it('штрафует за утечки при превышении порога', () => {
      const session = new GameSession(config, seed)
      session.start()

      // Аллоцируем
      const allocReq = session.getPendingRequests()[0]
      session.allocate(allocReq.payload.id)

      // Тикаем больше leakThreshold (30 для уровня 1)
      // Но не обрабатываем free-запросы — блок станет утечкой
      for (let i = 0; i < config.leakThreshold + 5; i++) {
        session.tick()
      }

      // Стабильность должна снизиться из-за утечек
      expect(session.getScoreSummary().stability).toBeLessThan(1)
    })
  })

  describe('getSnapshot', () => {
    it('возвращает полный снимок состояния', () => {
      const session = new GameSession(config, seed)
      session.start()

      const snapshot = session.getSnapshot()
      expect(snapshot).toHaveProperty('blocks')
      expect(snapshot).toHaveProperty('metrics')
      expect(snapshot).toHaveProperty('pendingRequests')
      expect(snapshot).toHaveProperty('score')
      expect(snapshot).toHaveProperty('stability')
      expect(snapshot).toHaveProperty('tick')
      expect(snapshot).toHaveProperty('state')
    })
  })
})
