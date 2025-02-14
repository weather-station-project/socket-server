import { NestFactory } from '@nestjs/core'
import { AppModule } from './modules/app.module'
import { Logger, LoggerErrorInterceptor } from 'nestjs-pino'
import { GlobalConfig } from './config/global.config'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  })

  app.enableShutdownHooks().useGlobalInterceptors(new LoggerErrorInterceptor()).useLogger(app.get(Logger))

  if (GlobalConfig.environment.isDevelopment) {
    app.enableCors()
  }

  await app.listen(GlobalConfig.server.serverPort)
}

bootstrap()
