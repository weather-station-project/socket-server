import { ConsoleLogger, Injectable } from '@nestjs/common'
import { SocketIdStorage } from './socketStorage.util'

const DEFAULT_ERROR_MESSAGE: string = 'Health Check has failed!'

@Injectable()
export class TerminusLogger extends ConsoleLogger {
  error(message: string): void {
    const requestId: string = SocketIdStorage.get()
    let jsonContent: JSON = undefined

    try {
      jsonContent = JSON.parse(message.replace(DEFAULT_ERROR_MESSAGE, ''))
    } catch {
      /* empty */
    }

    let enhancedMessage: string
    if (requestId) {
      enhancedMessage = `[${this.context}] [${requestId}] - ${DEFAULT_ERROR_MESSAGE}`
    } else {
      enhancedMessage = `[${this.context}] - ${DEFAULT_ERROR_MESSAGE}`
    }

    console.error({
      context: this.context,
      correlationId: requestId,
      severity: 'ERROR',
      message: enhancedMessage,
      healthCheckResult: jsonContent,
    })
  }
}
