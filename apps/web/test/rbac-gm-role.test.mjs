import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

import { roleFromApi } from '../features/auth/role-from-api.ts'
import {
  isAdminRole,
  isGmRole,
  permissions,
  roleHasPermission,
  rolePermissions,
  roleLabels
} from '../data/security.ts'

test('roleFromApi maps the backend GM role to the frontend gm literal, not a downgrade to player', () => {
  assert.equal(roleFromApi('GM'), 'gm')
  assert.equal(roleFromApi('gm'), 'gm')
})

test('roleFromApi still maps every pre-existing backend role correctly', () => {
  assert.equal(roleFromApi('PLAYER'), 'player')
  assert.equal(roleFromApi('ADMIN'), 'admin')
  assert.equal(roleFromApi('SUPER_ADMIN'), 'super-admin')
})

test('roleFromApi falls back to player for any unrecognized role string', () => {
  assert.equal(roleFromApi('WHATEVER_NEW_ROLE'), 'player')
  assert.equal(roleFromApi(''), 'player')
})

test('GM is not treated as an admin role', () => {
  assert.equal(isAdminRole('gm'), false)
  assert.equal(isGmRole('gm'), true)
})

test('admin and super-admin are not treated as the GM role', () => {
  assert.equal(isGmRole('admin'), false)
  assert.equal(isGmRole('super-admin'), false)
  assert.equal(isGmRole('player'), false)
})

test('GM has a distinct role label, not reused from another role', () => {
  assert.equal(roleLabels.gm, 'Game Master')
  assert.notEqual(roleLabels.gm, roleLabels.admin)
  assert.notEqual(roleLabels.gm, roleLabels.player)
})

test('GM does not inherit any admin.* permission by default', () => {
  const gmAccess = rolePermissions.gm
  const adminOnlyPermissions = Object.values(permissions).filter((permission) =>
    permission.startsWith('admin.')
  )
  for (const permission of adminOnlyPermissions) {
    assert.equal(roleHasPermission('gm', permission), false, `GM should not have ${permission}`)
  }
  assert.ok(Array.isArray(gmAccess))
})

test('GM retains the baseline player-level permissions (own account, characters, community, etc.)', () => {
  assert.equal(roleHasPermission('gm', permissions.accountManage), true)
  assert.equal(roleHasPermission('gm', permissions.charactersManage), true)
  assert.equal(roleHasPermission('gm', permissions.communityAccess), true)
})

test('GM has its own curated operational permissions', () => {
  assert.equal(roleHasPermission('gm', permissions.gmDashboardView), true)
  assert.equal(roleHasPermission('gm', permissions.gmCharactersView), true)
  assert.equal(roleHasPermission('gm', permissions.gmGuildsView), true)
})

test('PLAYER does not have any GM-only permission', () => {
  assert.equal(roleHasPermission('player', permissions.gmDashboardView), false)
  assert.equal(roleHasPermission('player', permissions.gmCharactersView), false)
})

test('ADMIN can configure events without inheriting delegated GM execution powers', () => {
  // ADMIN's admin.* permissions are delegated per-account via AccountPermission
  // overrides. Event definition/schedule configuration additionally needs the
  // shared read permission used by the API and the /painel/admin/eventos route.
  assert.equal(roleHasPermission('admin', permissions.accountManage), true)
  assert.equal(roleHasPermission('admin', permissions.guidesFutureView), true)
  assert.equal(roleHasPermission('admin', permissions.gmEventsView), true)
  assert.equal(roleHasPermission('admin', permissions.gmEventsExecute), false)
  assert.equal(roleHasPermission('admin', permissions.gmEventsCancel), false)
})

test('SUPER_ADMIN keeps full wildcard access unaffected by the new GM role', () => {
  assert.equal(roleHasPermission('super-admin', permissions.gmDashboardView), true)
  assert.equal(roleHasPermission('super-admin', permissions.adminRolesManage), true)
})

test('admin account actions use an in-app modal instead of unsupported browser prompts', async () => {
  const page = await readFile(new URL('../pages/painel/admin/contas.vue', import.meta.url), 'utf8')
  assert.doesNotMatch(page, /window\.prompt\s*\(/)
  assert.match(page, /role="dialog"/)
  assert.match(page, /autocomplete="current-password"/)
  assert.match(page, /autocomplete="one-time-code"/)
})

test('account session actions use an in-app modal instead of unsupported browser dialogs', async () => {
  const page = await readFile(new URL('../pages/painel/conta.vue', import.meta.url), 'utf8')
  const sessionActions = page.slice(page.indexOf('const requestStepUpToken'), page.indexOf('const startTwoFactor'))
  assert.doesNotMatch(sessionActions, /window\.prompt\s*\(/)
  assert.doesNotMatch(sessionActions, /\bconfirm\s*\(/)
  assert.match(page, /aria-labelledby="session-action-title"/)
  assert.match(page, /autocomplete="current-password"/)
  assert.match(page, /autocomplete="one-time-code"/)
  assert.match(page, /accountSecurityApi\.revokeSession\(action\.sessionId/)
})

test('SUPER_ADMIN can delegate the curated event permissions to a GM account', async () => {
  const page = await readFile(new URL('../pages/painel/admin/contas.vue', import.meta.url), 'utf8')
  assert.doesNotMatch(page, /\bdelegablePermissions\b/)
  assert.match(page, /\['admin', 'gm'\]\.includes\(account\.role\)/)
  assert.match(page, /permissionAccount\.value\?\.role === 'gm' \? gmPermissionOptions/)
  assert.match(page, /permissions\.gmEventsExecute/)
  assert.match(page, /permissions\.gmEventsCancel/)
  assert.match(page, /permissions\.gmEventsResultsValidate/)
})

test('GM event cancellation uses an in-app validated modal instead of prompt()', async () => {
  const page = await readFile(new URL('../pages/painel/gm/eventos/index.vue', import.meta.url), 'utf8')
  const cancellation = page.slice(page.indexOf('const cancelRun'), page.indexOf('const submitResult'))
  assert.doesNotMatch(cancellation, /window\.prompt\s*\(/)
  assert.match(page, /aria-labelledby="cancel-event-title"/)
  assert.match(page, /reason\.length < 5/)
  assert.match(page, /gmEventsApi\.cancelRun\(action\.runId, reason\)/)
})
