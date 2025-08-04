import { HealthIndicatorResult, HealthIndicatorService } from '@nestjs/terminus'
import { Injectable } from '@nestjs/common'
import { io, Socket } from 'socket.io-client'
import { GlobalConfig } from '../config/global.config'
import { AuthService } from '../services/auth.service'
import { IToken, Role, UserDto } from '../model/model.model'

const ATTEMPTS_NUMBER: number = 5

@Injectable()
export class SocketHealthIndicator {
  constructor(
    private readonly authService: AuthService,
    private readonly healthIndicatorService: HealthIndicatorService
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    let socketInstance: Socket
    const indicator = this.healthIndicatorService.check(key)

    try {
      const token: IToken = await this.authService.auth({
        login: 'test',
        role: Role.Read,
      } as UserDto)
      let attempt: number = 1

      socketInstance = io(
        `${GlobalConfig.environment.isProduction ? 'https' : 'http'}://localhost:${GlobalConfig.server.serverPort}`,
        {
          transports: ['websocket'],
          autoConnect: false,
          reconnection: false,
          auth: {
            token: `Bearer ${token.access_token}`,
          },
          rejectUnauthorized: false,
        }
      )
      socketInstance.connect()

      while (!socketInstance.connected && attempt <= ATTEMPTS_NUMBER) {
        await new Promise((f) => setTimeout(f, 1000))
        attempt++
      }

      if (socketInstance.connected) {
        return indicator.up()
      }

      return indicator.down({ exception: 'Socket server not available' })
    } catch (e) {
      return indicator.down({ exception: e.message() })
    } finally {
      if (socketInstance) {
        socketInstance.disconnect()
      }
    }
  }
}
