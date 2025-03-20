import { NestFactory } from '@nestjs/core'
import { AppModule } from './modules/app.module'
import { Logger, LoggerErrorInterceptor } from 'nestjs-pino'
import { GlobalConfig } from './config/global.config'
import * as fs from 'node:fs'
import { HttpsOptions } from '@nestjs/common/interfaces/external/https-options.interface'

async function bootstrap(): Promise<void> {
  const httpsOptions: HttpsOptions = GlobalConfig.environment.isProduction
    ? {
        key: fs.readFileSync(GlobalConfig.server.keyFile),
        cert: fs.readFileSync(GlobalConfig.server.certFile),
      }
    : undefined
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    httpsOptions: httpsOptions,
  })

  app.enableShutdownHooks().useGlobalInterceptors(new LoggerErrorInterceptor()).useLogger(app.get(Logger))

  if (GlobalConfig.environment.isDevelopment) {
    app.enableCors()
  }

  await app.listen(GlobalConfig.server.serverPort)
}

bootstrap()
