import { SetMetadata } from '@nestjs/common'
import type { PermissionKey } from './permissions'

export const permissionsMetadataKey = 'bloodmoon:permissions'

export const RequirePermissions = (...permissions: PermissionKey[]) =>
  SetMetadata(permissionsMetadataKey, permissions)
