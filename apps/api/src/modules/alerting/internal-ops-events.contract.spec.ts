import { BadRequestException } from '@nestjs/common'
import { parseReportOpsEventInput } from './internal-ops-events.contract'

const validBody = {
  module: 'backup',
  eventType: 'BACKUP_FAILED',
  severity: 'CRITICAL',
  description: 'mysqldump exited non-zero.'
}

describe('parseReportOpsEventInput', () => {
  it('accepts a well-formed body', () => {
    const parsed = parseReportOpsEventInput(validBody)
    expect(parsed).toEqual(validBody)
  })

  it('accepts optional data as a plain object', () => {
    const parsed = parseReportOpsEventInput({ ...validBody, data: { host: 'cpanel' } })
    expect(parsed.data).toEqual({ host: 'cpanel' })
  })

  it('rejects a module outside the allow-list (e.g. an arbitrary admin module)', () => {
    expect(() => parseReportOpsEventInput({ ...validBody, module: 'accounts' })).toThrow(BadRequestException)
  })

  it('rejects a severity outside the allow-list', () => {
    expect(() => parseReportOpsEventInput({ ...validBody, severity: 'FATAL' })).toThrow(BadRequestException)
  })

  it('rejects a missing eventType', () => {
    const { eventType, ...rest } = validBody
    expect(() => parseReportOpsEventInput(rest)).toThrow(BadRequestException)
  })

  it('rejects an eventType over 191 characters', () => {
    expect(() => parseReportOpsEventInput({ ...validBody, eventType: 'x'.repeat(192) })).toThrow(BadRequestException)
  })

  it('rejects a description over 2000 characters', () => {
    expect(() => parseReportOpsEventInput({ ...validBody, description: 'x'.repeat(2001) })).toThrow(BadRequestException)
  })

  it('rejects data that is an array instead of a plain object', () => {
    expect(() => parseReportOpsEventInput({ ...validBody, data: [1, 2, 3] })).toThrow(BadRequestException)
  })

  it('rejects a non-object body', () => {
    expect(() => parseReportOpsEventInput('not an object')).toThrow(BadRequestException)
    expect(() => parseReportOpsEventInput(null)).toThrow(BadRequestException)
  })
})
