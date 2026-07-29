import { Global, Module } from '@nestjs/common'
import { CorrelationMiddleware } from '../../common/correlation.middleware'
import { RequestContextService } from '../../common/request-context.service'
import { SafeExceptionFilter } from '../../common/safe-exception.filter'
import { ObservabilityService } from './observability.service'

@Global()
@Module({
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
