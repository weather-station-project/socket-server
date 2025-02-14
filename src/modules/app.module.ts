import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { onApplicationBootstrapLogging, onApplicationShutdownLogging } from '../utils/lifeCycleLogging.util'
import { GlobalConfig } from '../config/global.config'
import { LoggerModule } from 'nestjs-pino'
import { v4 as uuidv4 } from 'uuid'
import { ReqId } from 'pino-http'
import { IncomingMessage, ServerResponse } from 'http'
import pino from 'pino'
import { RequestIdStorage, SocketIdStorage } from '../utils/socketStorage.util'
import LogFn = pino.LogFn
import { AuthModule } from './auth.module'
import { HealthModule } from './health.module'
import { MeasurementsModule } from './measurements.module'

interface ILogBinding {
  context: string
  correlationId?: string
  err?: Error
}

// Help about pino -> https://github.com/pinojs/pino/blob/HEAD/docs/api.md
@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        autoLogging: false,
        base: undefined,
        level: GlobalConfig.log.level,
        timestamp: !GlobalConfig.environment.isProduction,
        customProps: (request: IncomingMessage) => ({
          correlationId: request.id,
        }),
        hooks: {
          logMethod(args: Parameters<LogFn>, method: LogFn): void {
            const bindings: ILogBinding = args[0] as unknown as ILogBinding
            const socketId: string = SocketIdStorage.get()
            const text: string = args.length >= 2 ? args[args.length - 1] : bindings.err.message // Message always comes in the last place of the arguments

            let message: string = undefined
            if (socketId) {
              bindings.correlationId = socketId
              message = `[${bindings.context}] [${socketId}] - ${text}`
            } else {
              message = `[${bindings.context}] - ${text}`
            }

            return method.apply(this, [bindings, message])
          },
        },
        customAttributeKeys: { req: 'httpRequest', res: 'httpResponse' },
        transport: {
          target: 'pino-pretty',
          options: {
            singleLine: true,
            colorize: true,
          },
        },
      },
    }),
    ConfigModule.forRoot({ cache: true, isGlobal: true }),
    AuthModule,
    HealthModule,
    MeasurementsModule,
  ],
  providers: [onApplicationShutdownLogging],
})
export class AppModule {}
