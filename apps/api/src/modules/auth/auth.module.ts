import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { AuditModule } from '../audit/audit.module'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { JwtAuthGuard } from './jwt-auth.guard'
import { RolesGuard } from './roles.guard'

@Module({
  imports: [
    AuditModule,
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me'
    })
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, RolesGuard],
  exports: [AuthService, JwtAuthGuard, RolesGuard, JwtModule]
})
export class AuthModule {}
