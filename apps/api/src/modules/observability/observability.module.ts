import { Global, Module } from '@nestjs/common'
import { CorrelationMiddleware } from '../../common/correlation.middleware'
import { RequestContextService } from '../../common/request-context.service'
import { SafeExceptionFilter } from '../../common/safe-exception.filter'
import { AlertingModule } from '../alerting/alerting.module'
import { ObservabilityService } from './observability.service'

@Global()
@Module({
  imports: [AlertingModule],
  providers: [
    RequestContextService,
    CorrelationMiddleware,
    ObservabilityService,
    SafeExceptionFilter
  ],
  exports: [
    RequestContextService,
    CorrelationMiddleware,
    ObservabilityService,
    SafeExceptionFilter
  ]
})
export class ObservabilityModule {}
