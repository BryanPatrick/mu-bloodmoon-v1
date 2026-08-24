import { Module } from '@nestjs/common'
import { GameAccountIdentityService } from './game-account-identity.service'
import { GameAccountProvisioningService } from './game-account-provisioning.service'
import { GameCommandTransportClient } from './game-command-transport.client'
import { GameCredentialEnvelopeService } from './game-credential-envelope.service'

@Module({
  providers: [GameAccountIdentityService, GameAccountProvisioningService, GameCommandTransportClient, GameCredentialEnvelopeService],
  exports: [GameAccountIdentityService, GameAccountProvisioningService]
})
export class GameAccountIdentityModule {}
