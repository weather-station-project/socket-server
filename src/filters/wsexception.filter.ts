import { ArgumentsHost, Catch, HttpException, Logger } from '@nestjs/common'
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets'
import { Socket } from 'socket.io'
import { GlobalConfig } from '../config/global.config'
import { SocketIdStorage } from '../utils/socketStorage.util'
import { ICustomException } from '../model/model.model'

@Catch(WsException, HttpException)
export class WebsocketExceptionsFilter extends BaseWsExceptionFilter {
  private readonly logger: Logger = new Logger(WebsocketExceptionsFilter.name)

  catch(exception: WsException | HttpException, host: ArgumentsHost): void {
    const client: Socket = host.switchToWs().getClient()
    SocketIdStorage.set(client.id)

    const content: string = JSON.stringify({
      status: exception instanceof WsException ? 'ws_error' : 'error',
      message: exception.message,
    } as ICustomException)

    this.logger.debug(`Emitting event '${GlobalConfig.socket.exceptionEvent}' with content '${content}'`)

    client.compress(true).emit(GlobalConfig.socket.exceptionEvent, content)
    client.disconnect(true)
  }
}