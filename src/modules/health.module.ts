import { TerminusModule } from '@nestjs/terminus'
import { Module } from '@nestjs/common'
import { HealthController } from '../controllers/health.controller'
import { SocketHealthIndicator } from '../indicators/socket.indicator'
import { AuthModule } from './auth.module'

@Module({
  imports: [
    TerminusModule.forRoot({
      errorLogStyle: 'pretty',
      logger: true,
    }),
    AuthModule,
  ],
  controllers: [HealthController],
  providers: [SocketHealthIndicator],
})
export class HealthModule {}
