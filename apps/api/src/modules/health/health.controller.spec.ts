import { HttpStatus } from '@nestjs/common'
import { HealthController } from './health.controller'

describe('HealthController', () => {
  function makeRes() {
    return { status: jest.fn().mockReturnThis() } as unknown as import('express').Response
  }

  describe('GET /health -- liveness', () => {
    it('returns 200-shaped ok payload without touching Prisma', async () => {
      const prisma = { $queryRaw: jest.fn() }
      const controller = new HealthController(prisma as never)

      const result = controller.health()

      expect(result).toEqual({ status: 'ok' })
      expect(prisma.$queryRaw).not.toHaveBeenCalled()
    })

    it('never includes anything beyond status', () => {
      const controller = new HealthController({ $queryRaw: jest.fn() } as never)
      expect(Object.keys(controller.health())).toEqual(['status'])
    })
  })

  describe('GET /ready -- readiness', () => {
    it('DB available -> 200 { status: ready }, no status() override', async () => {
      const prisma = { $queryRaw: jest.fn().mockResolvedValue([{ '1': 1 }]) }
      const controller = new HealthController(prisma as never)
      const res = makeRes()

      const result = await controller.ready(res)

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1)
      expect(result).toEqual({ status: 'ready' })
      expect(res.status).not.toHaveBeenCalled()
    })

    it('DB unavailable -> 503 { status: not_ready }, no leaked error detail', async () => {
      const dbError = new Error('P1001: connection refused to 10.0.0.5:3306 for user mubloodxz_bmrot')
      const prisma = { $queryRaw: jest.fn().mockRejectedValue(dbError) }
      const controller = new HealthController(prisma as never)
      const res = makeRes()

      const result = await controller.ready(res)

      expect(res.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE)
      expect(result).toEqual({ status: 'not_ready' })
      expect(JSON.stringify(result)).not.toMatch(/mubloodxz_bmrot|10\.0\.0\.5|connection refused|P1001/)
    })

    it('response body never contains more than the status field either way', async () => {
      const okPrisma = { $queryRaw: jest.fn().mockResolvedValue([{ '1': 1 }]) }
      const okController = new HealthController(okPrisma as never)
      expect(Object.keys(await okController.ready(makeRes()))).toEqual(['status'])

      const downPrisma = { $queryRaw: jest.fn().mockRejectedValue(new Error('boom')) }
      const downController = new HealthController(downPrisma as never)
      expect(Object.keys(await downController.ready(makeRes()))).toEqual(['status'])
    })
  })
})
