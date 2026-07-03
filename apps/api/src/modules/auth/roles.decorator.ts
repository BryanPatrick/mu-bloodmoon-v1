import { SetMetadata } from '@nestjs/common'
import type { Role } from '@prisma/client'

export const rolesMetadataKey = 'bloodmoon:roles'

export const Roles = (...roles: Role[]) => SetMetadata(rolesMetadataKey, roles)
