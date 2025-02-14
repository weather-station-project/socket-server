import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus'
import { Injectable } from '@nestjs/common'
import { io, Socket } from 'socket.io-client'
import { GlobalConfig } from '../config/global.config'
import { AuthService } from '../services/auth.service'
import { IDevice, IToken } from '../model/internal/models.internal'

const HEALTH_CHECK_STRING: string = 'health-check'
const ATTEMPTS_NUMBER: number = 5

@Injectable()
export class SocketHealthIndicator extends HealthIndicator {
    constructor(private readonly authService: AuthService) {
        super()
    }

    async isHealthy(key: string): Promise<HealthIndicatorResult> {
        let socketInstance: Socket

        try {
            const token: IToken = await this.authService.auth({
                family: HEALTH_CHECK_STRING,
                storeNo: HEALTH_CHECK_STRING,
                deviceId: HEALTH_CHECK_STRING,
                location: HEALTH_CHECK_STRING,
                type: HEALTH_CHECK_STRING,
                deviceType: HEALTH_CHECK_STRING,
            } as IDevice)
            let attempt: number = 1

            socketInstance = io(`http://localhost:${GlobalConfig.server.serverPort}`, {
                transports: ['websocket'],
                autoConnect: false,
                reconnection: false,
                auth: {
                    token: `Bearer ${token.access_token}`,
                },
            })
            socketInstance.connect()

            while (!socketInstance.connected && attempt <= ATTEMPTS_NUMBER) {
                await new Promise((f) => setTimeout(f, 1000))
                attempt++
            }

            if (socketInstance.connected) {
                return this.getStatus(key, true)
            }

            throw new Error('Socket server not available')
        } catch (e) {
            throw new HealthCheckError(e.message, this.getStatus(key, false, { exception: e.message }))
        } finally {
            if (socketInstance) {
                socketInstance.disconnect()
            }
        }
    }
}