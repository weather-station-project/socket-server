import { TerminusModule } from '@nestjs/terminus'
import { Module } from '@nestjs/common'
import { HealthController } from '../controllers/health.controller'
import { GlobalConfig } from '../config/global.config'
import { TerminusLogger } from '../utils/terminusLogger.util'

@Module({
  imports: [
    TerminusModule.forRoot({
      errorLogStyle: GlobalConfig.environment.isProduction ? 'json' : 'pretty',
      logger: GlobalConfig.environment.isProduction ? TerminusLogger : true,
    }),
  ],
  controllers: [HealthController],
})
export class HealthModule {}
