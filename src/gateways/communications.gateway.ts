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
import { getUserFromSocketData, ICustomException, Role, UserDto } from '../model/model.model'

const ACK: string = 'OK'

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

  constructor(private readonly authService: AuthService) {}

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
      this.logInfoOrSkip(socket, 'Starting connection')

      const user: UserDto = this.authService.getUserFromToken(this.authService.retrieveToken(socket))
      socket.data = user
      socket.join(GlobalConfig.socket.roomName)

      this.logInfoOrSkip(
        socket,
        `User '${user.login}' with role '${user.role}' joined to '${GlobalConfig.socket.roomName}'`
      )
    } catch (e) {
      if (e instanceof WsException) {
        this.logInfoOrSkip(socket, `Socket forced to disconnect due to '${e.message}'`)

        this.emitToClient(
          socket,
          GlobalConfig.socket.exceptionEvent,
          JSON.stringify({
            status: 'ws_error',
            message: e.message,
          } as ICustomException)
        )
      } else {
        this.logErrorOrSkip(socket, 'Error when trying connection', e)
      }

      socket.disconnect(true)
    }
  }

  async handleDisconnect(socket: Socket): Promise<void> {
    SocketIdStorage.set(socket.id)

    const user: UserDto = getUserFromSocketData(socket.data)
    this.logInfoOrSkip(socket, `Device with name '${user.login}' disconnected`)
  }

  @SubscribeMessage(GlobalConfig.socket.emitAirMeasurementEvent)
  sendAirMeasurementEvent(@ConnectedSocket() socket: Socket, @MessageBody() content: unknown): string {
    this.processMessage(socket, GlobalConfig.socket.emitAirMeasurementEvent, content)
    return ACK
  }

  @SubscribeMessage(GlobalConfig.socket.emitGroundTemperatureEvent)
  sendGroundTemperatureEvent(@ConnectedSocket() socket: Socket, @MessageBody() content: unknown): string {
    this.processMessage(socket, GlobalConfig.socket.emitGroundTemperatureEvent, content)
    return ACK
  }

  @SubscribeMessage(GlobalConfig.socket.emitWindMeasurementEvent)
  sendWindMeasurementEvent(@ConnectedSocket() socket: Socket, @MessageBody() content: unknown): string {
    this.processMessage(socket, GlobalConfig.socket.emitWindMeasurementEvent, content)
    return ACK
  }

  @SubscribeMessage(GlobalConfig.socket.emitRainfallEvent)
  sendRainfallEvent(@ConnectedSocket() socket: Socket, @MessageBody() content: unknown): string {
    this.processMessage(socket, GlobalConfig.socket.emitRainfallEvent, content)
    return ACK
  }

  private processMessage(socket: Socket, event: string, content: unknown): void {
    SocketIdStorage.set(socket.id)

    try {
      const user: UserDto = getUserFromSocketData(socket.data)

      if (user.role !== Role.Write) {
        this.logger.warn(`User '${user.login}' has no permission to send events`)

        this.emitToClient(
          socket,
          GlobalConfig.socket.exceptionEvent,
          JSON.stringify({
            status: 'ws_error',
            message: 'User has no permission to send events',
          } as ICustomException)
        )
      } else {
        this.emitToLocation(socket, event, content)
      }
    } catch (e) {
      this.logger.error(e, `Error on '${event}' event`)
    }
  }

  private emitToClient(socket: Socket, event: string, content: unknown): void {
    SocketIdStorage.set(socket.id)
    const user: UserDto = getUserFromSocketData(socket.data)

    socket.compress(true).emit(event, content)
    this.logDebugOrSkip(socket, `Emitting event '${event}' to '${user.login || socket.id}'`)
  }

  private emitToLocation(socket: Socket, event: string, content?: unknown): void {
    SocketIdStorage.set(socket.id)
    const user: UserDto = getUserFromSocketData(socket.data)

    if (content === undefined) {
      socket.compress(true).to(GlobalConfig.socket.roomName).emit(event)
    } else {
      socket.compress(true).to(GlobalConfig.socket.roomName).emit(event, content)
    }

    this.logDebugOrSkip(
      socket,
      `Emitting event '${event}' from '${user.login}' to the room '${GlobalConfig.socket.roomName}'`
    )
  }

  private getHeaderValue(socket: Socket, header: string): string | undefined {
    const value: string | string[] = socket.handshake.headers[header.toLowerCase()]

    if (Array.isArray(value)) {
      return value[0]
    }

    return value
  }

  private logDebugOrSkip(socket: Socket, message: string): void {
    if (this.getHeaderValue(socket, 'skip-logging') !== 'true') {
      this.logger.debug(message)
    }
  }

  private logInfoOrSkip(socket: Socket, message: string): void {
    if (this.getHeaderValue(socket, 'skip-logging') !== 'true') {
      this.logger.log(message)
    }
  }

  private logErrorOrSkip(socket: Socket, message: string, error: Error): void {
    if (this.getHeaderValue(socket, 'skip-logging') !== 'true') {
      this.logger.error(error, message)
    }
  }
}
