import { safeInternalErrorLabel } from './safe-exception.filter'
import { SafeExceptionFilter } from './safe-exception.filter'

describe('safeInternalErrorLabel', () => {
  it('keeps a known error class but never the message or stack', () => {
    const error = new Error('cpf=11122233344 providerToken=secret')
    error.stack = 'private provider response'
    expect(safeInternalErrorLabel(error)).toBe('Error')
  })

  it('rejects a user-controlled error name', () => {
    const error = new Error('anything')
    error.name = 'Error: secret'
    expect(safeInternalErrorLabel(error)).toBe('InternalError')
  })

  it('does not persist or print a provider error containing synthetic secrets', async () => {
    const recordSystemError = jest.fn()
    const responseJson = jest.fn()
    const log = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    const filter = new SafeExceptionFilter(
      { recordSystemError } as never,
      { correlationId: () => 'test-request' } as never,
      { recordAndCheck: () => false } as never
    )
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status: () => ({ json: responseJson }) }),
        getRequest: () => ({ method: 'POST', url: '/payments/test?token=synthetic-secret', headers: {} })
      })
    }
    try {
      await filter.catch(new Error('cpf=11122233344 token=synthetic-secret'), host as never)
      const recorded = JSON.stringify(recordSystemError.mock.calls)
      const printed = JSON.stringify(log.mock.calls)
      expect(recorded).not.toContain('11122233344')
      expect(recorded).not.toContain('synthetic-secret')
      expect(printed).not.toContain('11122233344')
      expect(printed).not.toContain('synthetic-secret')
      expect(responseJson).toHaveBeenCalled()
    } finally {
      log.mockRestore()
    }
  })
})
