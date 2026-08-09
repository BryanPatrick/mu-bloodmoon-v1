import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getErrorPresentation,
  getSafeRequestId,
  normalizeErrorStatus
} from '../utils/error-presentation.js'

test('maps a missing page to the public 404 presentation', () => {
  const status = normalizeErrorStatus({ statusCode: 404 })

  assert.equal(status, 404)
  assert.equal(getErrorPresentation(status).title, 'Pagina nao encontrada')
})

test('preserves forbidden and masks unknown frontend exceptions as 500', () => {
  assert.equal(normalizeErrorStatus({ statusCode: 403 }), 403)
  assert.equal(normalizeErrorStatus(new Error('internal detail')), 500)
  assert.equal(getErrorPresentation(500).title, 'Nao foi possivel carregar esta pagina')
})

test('only accepts a safe public correlation identifier', () => {
  assert.equal(getSafeRequestId({ data: { requestId: 'request-safe-19-4' } }), 'request-safe-19-4')
  assert.equal(getSafeRequestId({ data: { requestId: '<script>alert(1)</script>' } }), '')
  assert.equal(getSafeRequestId({ stack: 'private stack' }), '')
})
