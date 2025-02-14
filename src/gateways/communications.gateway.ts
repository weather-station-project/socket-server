import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { Logger, UseFilters, UseGuards } from '@nestjs/common'
import { GlobalConfig } from '../config/global.config'
import { JwtAuthGuard } from '../guards/jwt-auth.guard'
import { AuthService } from '../services/auth.service'
import { WebsocketExceptionsFilter } from '../filters/wsexception.filter'
import { SocketIdStorage } from '../utils/socketStorage.util'
import { instrument } from '@socket.io/admin-ui'
import * as bcrypt from 'bcryptjs'
import { getUserFromSocketData, ICustomException, UserDto } from '../model/model.model'

@UseFilters(WebsocketExceptionsFilter)
@UseGuards(JwtAuthGuard)
@WebSocketGateway({
  transports: ['websocket', 'polling'],
  cors: {
    origin: ['https://admin.socket.io'],
    credentials: true,
  },
})
export class CommunicationsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server
  private readonly logger: Logger = new Logger(CommunicationsGateway.name)

  constructor(
    private readonly authService: AuthService
  ) {}

  afterInit(): void {
    instrument(this.server, {
      auth: {
        type: 'basic',
        username: GlobalConfig.auth.adminUser,
        password: bcrypt.hashSync(GlobalConfig.auth.adminPassword, GlobalConfig.auth.hashSaltRounds),
      },
      mode: 'development',
    })

    this.logger.log(`Socket server ready on port '${GlobalConfig.server.serverPort}'`)
  }

  async handleConnection(socket: Socket): Promise<void> {
    SocketIdStorage.set(socket.id)

    try {
      this.logger.log('Starting connection')

      const user: UserDto = this.authService.getUserFromToken(this.authService.retrieveToken(socket))
      socket.data = user
      socket.join(GlobalConfig.socket.roomName)

      this.logger.log(`User '${user.login}' with role '${user.role}' joined to '${GlobalConfig.socket.roomName}'`)
    } catch (e) {
      if (e instanceof WsException) {
        this.logger.log(`Socket forced to disconnect due to '${e.message}'`)

        this.emitToClient(
          socket,
          GlobalConfig.socket.exceptionEvent,
          JSON.stringify({
            status: 'ws_error',
            message: e.message,
          } as ICustomException)
        )
      } else {
        this.logger.error(e, `Error when trying connection`)
      }

      socket.disconnect(true)
    }
  }

  async handleDisconnect(socket: Socket): Promise<void> {
    SocketIdStorage.set(socket.id)

    const user: UserDto = getUserFromSocketData(socket.data)
    this.logger.log(`Device with name '${user.login}' disconnected`)
  }

  @SubscribeMessage(GlobalConfig.socket.sendMeasurementEvent)
  castMainCarouselElementEvent(@ConnectedSocket() socket: Socket, @MessageBody() content: unknown): void {
    SocketIdStorage.set(socket.id)

    try {
      this.emitToLocation(socket, GlobalConfig.socket.sendMeasurementEvent, content)
    } catch (e) {
      this.logger.error(e, `Error on '${GlobalConfig.socket.sendMeasurementEvent}' event`)
    }
  }

  private emitToClient(socket: Socket, event: string, content:unknown): void {
    SocketIdStorage.set(socket.id)
    socket.compress(true).emit(event, content)
  }

  private emitToLocation(socket: Socket, event: string, content?: unknown): void {
    SocketIdStorage.set(socket.id)

    if (content === undefined) {
      socket.compress(true).to(GlobalConfig.socket.roomName).emit(event)
    } else {
      socket.compress(true).to(GlobalConfig.socket.roomName).emit(event, content)
    }
  }
}
