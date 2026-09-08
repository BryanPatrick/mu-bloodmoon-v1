import { Module } from '@nestjs/common'
import { GameAccountIdentityService } from './game-account-identity.service'
import { GameAccountProvisioningService } from './game-account-provisioning.service'
import { GameCommandTransportClient } from './game-command-transport.client'
import { GameCredentialEnvelopeService } from './game-credential-envelope.service'

@Module({
  providers: [GameAccountIdentityService, GameAccountProvisioningService, GameCommandTransportClient, GameCredentialEnvelopeService],
  // GameCommandTransportClient exported per the GameBridge extension plan
  // (Part 1): its auth/signing/timeout plumbing is generic and meant to be
  // reused by new command types (vip-sync.module.ts) without modification.
  exports: [GameAccountIdentityService, GameAccountProvisioningService, GameCommandTransportClient]
})
export class GameAccountIdentityModule {}
