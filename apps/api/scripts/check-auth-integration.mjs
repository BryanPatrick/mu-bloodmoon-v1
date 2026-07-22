import assert from 'node:assert/strict'
import { generate } from 'otplib'

const apiBase = (process.env.API_TEST_BASE_URL || 'http://localhost:3333/api').replace(/\/$/, '')
const password = process.env.TEST_ACCOUNT_PASSWORD
if (!password) throw new Error('TEST_ACCOUNT_PASSWORD is required')

const request = async (path, options = {}) => {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      ...options.headers
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  })
  let data = null
  try { data = await response.json() } catch {}
  return { status: response.status, data }
}

const login = async (username) => {
  const result = await request('/auth/login', {
    method: 'POST',
    body: { username, password }
  })
  assert.equal(result.status, 201, `${username} login failed`)
  return result.data
}

const playerFirst = await login('player_teste')
assert.equal(playerFirst.user.role, 'PLAYER')
assert.equal((await request('/admin/dashboard/operational', { token: playerFirst.accessToken })).status, 403)

const playerSecond = await login('player_teste')
assert.equal((await request('/account/profile', { token: playerFirst.accessToken })).status, 401)
assert.equal((await request('/account/profile', { token: playerSecond.accessToken })).status, 200)
assert.equal((await request('/auth/refresh', {
  method: 'POST',
  body: { refreshToken: playerSecond.refreshToken }
})).status, 201)
const playerSessions = await request('/account/sessions', { token: playerSecond.accessToken })
assert.equal(playerSessions.status, 200)
assert.equal(playerSessions.data.filter((session) => session.active).length, 1)
assert.equal(playerSessions.data.some((session) => session.current), true)

const setup2fa = await request('/auth/2fa/setup', {
  method: 'POST', token: playerSecond.accessToken, body: { currentPassword: password }
})
assert.equal(setup2fa.status, 201)
assert.ok(setup2fa.data.secret)
assert.match(setup2fa.data.qrCode, /^data:image\/png;base64,/)
const firstCode = await generate({ secret: setup2fa.data.secret })
assert.equal((await request('/auth/2fa/verify', { method: 'POST', token: playerSecond.accessToken, body: { code: firstCode } })).status, 201)
const twoFactorLoginWithoutCode = await request('/auth/login', { method: 'POST', body: { username: 'player_teste', password } })
assert.equal(twoFactorLoginWithoutCode.status, 401)
assert.equal(twoFactorLoginWithoutCode.data.code, 'TWO_FACTOR_REQUIRED')
const loginCode = await generate({ secret: setup2fa.data.secret })
const twoFactorLogin = await request('/auth/login', { method: 'POST', body: { username: 'player_teste', password, totpCode: loginCode } })
assert.equal(twoFactorLogin.status, 201)
const disableCode = await generate({ secret: setup2fa.data.secret })
assert.equal((await request('/auth/2fa/disable', { method: 'POST', token: twoFactorLogin.data.accessToken, body: { currentPassword: password, code: disableCode } })).status, 201)

const admin = await login('adm_teste')
assert.equal(admin.user.role, 'ADMIN')
const adminDashboard = await request('/admin/dashboard/operational', { token: admin.accessToken })
assert.equal(adminDashboard.status, 200)
assert.equal('recentRevenue' in adminDashboard.data.metrics, false)
assert.equal((await request('/admin/dashboard/strategic', { token: admin.accessToken })).status, 403)
assert.equal((await request('/admin/finance/recharges', { token: admin.accessToken })).status, 403)
assert.equal((await request('/muserver-export/summary', { token: admin.accessToken })).status, 403)
const adminAccounts = await request('/admin/accounts?pageSize=100', { token: admin.accessToken })
assert.equal(adminAccounts.status, 200)
assert.equal(adminAccounts.data.data.every((account) => account.role === 'PLAYER'), true)
assert.equal(adminAccounts.data.data.every((account) => account.email.includes('***')), true)

const superAdmin = await login('superadm_teste')
assert.equal(superAdmin.user.role, 'SUPER_ADMIN')
assert.equal((await request('/admin/dashboard/strategic', { token: superAdmin.accessToken })).status, 200)
assert.equal((await request('/admin/finance/recharges', { token: superAdmin.accessToken })).status, 200)
assert.equal((await request('/muserver-export/summary', { token: superAdmin.accessToken })).status, 200)
const superAccounts = await request('/admin/accounts?pageSize=100', { token: superAdmin.accessToken })
assert.equal(superAccounts.status, 200)
const playerAccount = superAccounts.data.data.find((account) => account.username === 'player_teste')
assert.ok(playerAccount)

const promote = await request(`/admin/accounts/${playerAccount.id}`, {
  method: 'PATCH',
  token: superAdmin.accessToken,
  body: { role: 'ADMIN', reason: 'Integration permission test' }
})
assert.equal(promote.status, 200)
assert.equal(promote.data.role, 'ADMIN')

const demote = await request(`/admin/accounts/${playerAccount.id}`, {
  method: 'PATCH',
  token: superAdmin.accessToken,
  body: { role: 'PLAYER', reason: 'Restore integration fixture' }
})
assert.equal(demote.status, 200)
assert.equal(demote.data.role, 'PLAYER')

const selfChange = await request(`/admin/accounts/${superAdmin.user.id}`, {
  method: 'PATCH',
  token: superAdmin.accessToken,
  body: { status: 'BLOCKED', reason: 'Self protection integration test' }
})
assert.equal(selfChange.status, 403)

console.log('Auth integration OK')
