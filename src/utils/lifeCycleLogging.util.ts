import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common'

const logger: Logger = new Logger('LifeCycleLogging')

@Injectable()
export class onApplicationShutdownLogging implements OnApplicationShutdown {
  onApplicationShutdown(signal?: string): void {
    logger.log(`Application shutdown with signal '${signal}'`)
  }
}
