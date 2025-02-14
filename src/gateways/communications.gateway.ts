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
import { CommunicationsService } from '../services/communications.service'
import { getDeviceFromSocketData, ICustomException, IDevice, Type } from '../model/internal/models.internal'
import { GlobalConfig } from '../config/global.config'
import { JwtAuthGuard } from '../guards/jwt-auth.guard'
import { AuthService } from '../services/auth.service'
import { WebsocketExceptionsFilter } from '../filters/wsexception.filter'
import { SocketIdStorage } from '../utils/socketStorage.util'
import { instrument } from '@socket.io/admin-ui'
import * as bcrypt from 'bcryptjs'

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
    private readonly commService: CommunicationsService,
    private readonly authService: AuthService
  ) {}

  afterInit(): void {
    instrument(this.server, {
      auth: {
        type: 'basic',
        username: GlobalConfig.auth.adminUser,
        password: bcrypt.hashSync(GlobalConfig.auth.adminPassword, GlobalConfig.auth.passwordSalts),
      },
      mode: 'development',
    })

    this.logger.log(`Socket server ready on port '${GlobalConfig.server.serverPort}'`)
  }

  async handleConnection(socket: Socket): Promise<void> {
    SocketIdStorage.set(socket.id)

    try {
      this.logger.log('Starting connection')

      const device: IDevice = this.authService.getDeviceFromToken(this.authService.retrieveToken(socket))
      socket.data = device

      await this.validateConnection(socket, device)

      const locationName: string = this.getLocationName(device)
      socket.join(locationName)
      this.logger.log(`Device '${device.deviceId}' with type '${device.type}' joined to '${locationName}'`)

      await this.processConnectionMessages(socket, device)
    } catch (e) {
      if (e instanceof WsException) {
        this.logger.log(`Socket forced to disconnect due to '${e.message}'`)
        this.emitToClient(
          socket,
          GlobalConfig.socketLiterals.exceptionEvent,
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
    const device: IDevice = getDeviceFromSocketData(socket.data)
    const location: string = this.getLocationName(device)
    const name: string = device.deviceId

    try {
      this.logger.log(`Device with name '${name}' disconnected`)

      if (device.type === Type.Manager) {
        this.emitToLocation(
          socket,
          GlobalConfig.socketLiterals.managerDisconnectedEvent,
          `The manager '${name}' has disconnected`
        )

        if (!(await this.commService.isManagerInLocation(socket, location))) {
          this.emitToLocation(
            socket,
            GlobalConfig.socketLiterals.noManagersEvent,
            GlobalConfig.socketLiterals.noManagersMessage
          )
        }
      } else {
        this.emitToLocation(
          socket,
          GlobalConfig.socketLiterals.playerDisconnectedEvent,
          `The player '${name}' has disconnected`
        )

        if (!(await this.commService.isPlayerInLocation(socket, location))) {
          this.emitToLocation(
            socket,
            GlobalConfig.socketLiterals.noPlayersEvent,
            GlobalConfig.socketLiterals.noPlayersMessage
          )
        }
      }
    } catch (e) {
      this.logger.error(e, `Error when device with socket name '${name}' was disconnected`)
    }
  }

  @SubscribeMessage(GlobalConfig.socketLiterals.castMainCarouselElementEvent)
  castMainCarouselElementEvent(@ConnectedSocket() socket: Socket, @MessageBody() content: unknown): void {
    this.processMessage(
      socket,
      GlobalConfig.socketLiterals.castMainCarouselElementEvent,
      GlobalConfig.socketLiterals.playMainCarouselElementEvent,
      content
    )
  }

  @SubscribeMessage(GlobalConfig.socketLiterals.castPlpEvent)
  castPlpEvent(@ConnectedSocket() socket: Socket, @MessageBody() content: unknown): void {
    this.processMessage(
      socket,
      GlobalConfig.socketLiterals.castPlpEvent,
      GlobalConfig.socketLiterals.playPlpEvent,
      content
    )
  }

  @SubscribeMessage(GlobalConfig.socketLiterals.castPipEvent)
  castPipEvent(@ConnectedSocket() socket: Socket, @MessageBody() content: unknown): void {
    this.processMessage(
      socket,
      GlobalConfig.socketLiterals.castPipEvent,
      GlobalConfig.socketLiterals.playPipEvent,
      content
    )
  }

  @SubscribeMessage(GlobalConfig.socketLiterals.changeLanguageEvent)
  changeLanguageEvent(@ConnectedSocket() socket: Socket, @MessageBody() content: unknown): void {
    this.processMessage(
      socket,
      GlobalConfig.socketLiterals.changeLanguageEvent,
      GlobalConfig.socketLiterals.changeLanguageEvent,
      content
    )
  }

  @SubscribeMessage(GlobalConfig.socketLiterals.productOverflowsScreenEvent)
  productOverflowScreenEvent(@ConnectedSocket() socket: Socket, @MessageBody() content: unknown): void {
    this.processMessage(
      socket,
      GlobalConfig.socketLiterals.productOverflowsScreenEvent,
      GlobalConfig.socketLiterals.productOverflowsScreenEvent,
      content
    )
  }

  @SubscribeMessage(GlobalConfig.socketLiterals.sendMainCarouselDataEvent)
  sendMainCarouselDataEvent(@ConnectedSocket() socket: Socket, @MessageBody() content: unknown): void {
    this.processMessage(
      socket,
      GlobalConfig.socketLiterals.sendMainCarouselDataEvent,
      GlobalConfig.socketLiterals.buildMainCarouselEvent,
      content
    )
  }

  @SubscribeMessage(GlobalConfig.socketLiterals.castUpptackaSearchEvent)
  castUpptackaSearchEvent(@ConnectedSocket() socket: Socket, @MessageBody() content: unknown): void {
    this.processMessage(
      socket,
      GlobalConfig.socketLiterals.castUpptackaSearchEvent,
      GlobalConfig.socketLiterals.playUpptackaSearchEvent,
      content
    )
  }

  @SubscribeMessage(GlobalConfig.socketLiterals.castInspirationalImageEvent)
  castInspirationalImageEvent(@ConnectedSocket() socket: Socket, @MessageBody() content: unknown): void {
    this.processMessage(
      socket,
      GlobalConfig.socketLiterals.castInspirationalImageEvent,
      GlobalConfig.socketLiterals.playInspirationalImageEvent,
      content
    )
  }

  @SubscribeMessage(GlobalConfig.socketLiterals.sendInspirationalCarouselDataEvent)
  sendInspirationalCarouselDataEvent(@ConnectedSocket() socket: Socket, @MessageBody() content: unknown): void {
    this.processMessage(
      socket,
      GlobalConfig.socketLiterals.sendInspirationalCarouselDataEvent,
      GlobalConfig.socketLiterals.buildInspirationalCarouselEvent,
      content
    )
  }

  @SubscribeMessage(GlobalConfig.socketLiterals.castInspirationalCarouselElementEvent)
  castInspirationalCarouselElementEvent(@ConnectedSocket() socket: Socket, @MessageBody() content: unknown): void {
    this.processMessage(
      socket,
      GlobalConfig.socketLiterals.castInspirationalCarouselElementEvent,
      GlobalConfig.socketLiterals.playInspirationalCarouselElementEvent,
      content
    )
  }

  @SubscribeMessage(GlobalConfig.socketLiterals.castMainCarousel)
  castMainCarouselEvent(@ConnectedSocket() socket: Socket, @MessageBody() content: unknown): void {
    this.processMessage(
      socket,
      GlobalConfig.socketLiterals.castMainCarousel,
      GlobalConfig.socketLiterals.playMainCarousel,
      content
    )
  }

  @SubscribeMessage(GlobalConfig.socketLiterals.requestLastEvent)
  requestLastEvent(@ConnectedSocket() socket: Socket, @MessageBody() content: unknown): void {
    this.processMessage(
      socket,
      GlobalConfig.socketLiterals.requestLastEvent,
      GlobalConfig.socketLiterals.requestLastEvent,
      content
    )
  }

  @SubscribeMessage(GlobalConfig.socketLiterals.sendLastEvent)
  sendLastEvent(@ConnectedSocket() socket: Socket, @MessageBody() content: unknown): void {
    this.processMessage(
      socket,
      GlobalConfig.socketLiterals.sendLastEvent,
      GlobalConfig.socketLiterals.sendLastEvent,
      content
    )
  }

  @SubscribeMessage(GlobalConfig.socketLiterals.dragPipImageEvent)
  dragPipImageEvent(@ConnectedSocket() socket: Socket, @MessageBody() content: unknown): void {
    this.processMessage(
      socket,
      GlobalConfig.socketLiterals.dragPipImageEvent,
      GlobalConfig.socketLiterals.dragPipImageEvent,
      content
    )
  }

  private processMessage(socket: Socket, receivedEvent: string, eventToSend: string, content: unknown): void {
    SocketIdStorage.set(socket.id)

    try {
      this.emitToLocation(socket, eventToSend, content)
    } catch (e) {
      this.logger.error(e, `Error on '${receivedEvent}' event`)
    }
  }

  private getLocationName(device: IDevice): string {
    return `${device.storeNo}_${device.location}`
  }

  private emitToClient(socket: Socket, event: string, content): void {
    SocketIdStorage.set(socket.id)
    socket.compress(true).emit(event, content)
  }

  private async validateConnection(socket: Socket, device: IDevice): Promise<void> {
    SocketIdStorage.set(socket.id)
    const location: string = this.getLocationName(device)

    this.logger.debug('Validating device name is unique')
    if (!(await this.commService.deviceNameIsUniqueInLocation(socket, location, device.deviceId))) {
      throw new WsException(`Device '${device.deviceId}' is already in the location '${device.location}'`)
    }
  }

  private async processConnectionMessages(socket: Socket, device: IDevice): Promise<void> {
    const location: string = this.getLocationName(device)

    if (device.type === Type.Manager) {
      if (await this.commService.isPlayerInLocation(socket, location)) {
        this.emitToLocation(
          socket,
          GlobalConfig.socketLiterals.managerConnectedEvent,
          `The manager '${device.deviceId}' has connected`
        )
      } else {
        this.emitToClient(
          socket,
          GlobalConfig.socketLiterals.noPlayersEvent,
          GlobalConfig.socketLiterals.noPlayersMessage
        )
      }
    } else {
      if (await this.commService.isManagerInLocation(socket, location)) {
        this.emitToLocation(
          socket,
          GlobalConfig.socketLiterals.playerConnectedEvent,
          `The player '${device.deviceId}' has connected`
        )
      } else {
        this.emitToClient(
          socket,
          GlobalConfig.socketLiterals.noManagersEvent,
          GlobalConfig.socketLiterals.noManagersMessage
        )
      }
    }
  }

  private emitToLocation(socket: Socket, event: string, content?: unknown): void {
    SocketIdStorage.set(socket.id)
    const device: IDevice = getDeviceFromSocketData(socket.data)
    const location: string = this.getLocationName(device)

    if (content === undefined) {
      socket.compress(true).to(location).emit(event)
    } else {
      socket.compress(true).to(location).emit(event, content)
    }
  }
}
