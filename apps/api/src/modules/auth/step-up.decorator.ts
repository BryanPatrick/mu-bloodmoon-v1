import { SetMetadata } from '@nestjs/common'

export const requireStepUpMetadataKey = 'bloodmoon:require-step-up'

// Marks an endpoint as requiring a recent, explicit re-authentication
// (password + TOTP/recovery code) via POST /auth/step-up, on top of the
// normal session. Used for actions where "logged in" alone isn't enough:
// role changes, resetting another account's 2FA, other high-impact
// security changes.
export const RequireStepUp = () => SetMetadata(requireStepUpMetadataKey, true)
