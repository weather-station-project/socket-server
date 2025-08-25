import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { onApplicationShutdownLogging } from '../utils/lifeCycleLogging.util'
import { GlobalConfig } from '../config/global.config'
import { LoggerModule } from 'nestjs-pino'
import { IncomingMessage } from 'http'
import pino from 'pino'
import { SocketIdStorage } from '../utils/socketStorage.util'
import { AuthModule } from './auth.module'
import { HealthModule } from './health.module'
import { CommunicationsModule } from './comunications.module'
import LogFn = pino.LogFn

interface ILogBinding {
  context: string
  correlation_id?: string
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
          correlation_id: request.id,
        }),
        hooks: {
          logMethod(args: Parameters<LogFn>, method: LogFn): void {
            const bindings: ILogBinding = args[0] as unknown as ILogBinding
            const socketId: string = SocketIdStorage.get()
            const text: string = args.length >= 2 ? args[args.length - 1] : bindings.err.message // Message always comes in the last place of the arguments

            let message: string = undefined
            if (socketId) {
              bindings.correlation_id = socketId
              message = `[${bindings.context}] [${socketId}] - ${text}`
            } else {
              message = `[${bindings.context}] - ${text}`
            }

            return method.apply(this, [bindings, message])
          },
        },
        customAttributeKeys: { req: 'httpRequest', res: 'httpResponse' },
        transport: GlobalConfig.otel.debugInConsole
          ? {
              target: 'pino-pretty',
              options: {
                singleLine: true,
                colorize: true,
              },
            }
          : {
              target: 'pino-opentelemetry-transport',
            },
      },
    }),
    ConfigModule.forRoot({ cache: true, isGlobal: true }),
    AuthModule,
    HealthModule,
    CommunicationsModule,
  ],
  providers: [onApplicationShutdownLogging],
})
export class AppModule {}
