import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { IToken, ITokenPayload, UserDto } from '../model/model.model'
import { Socket } from 'socket.io'
import { SocketIdStorage } from '../utils/socketStorage.util'
import { WsException } from '@nestjs/websockets'
import { GlobalConfig } from '../config/global.config'

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async auth(user: UserDto): Promise<IToken> {
    const tokenPayload: ITokenPayload = { sub: user.login, user: user }

    return {
      access_token: await this.jwtService.signAsync(tokenPayload),
    }
  }

  getUserFromToken(token: string): UserDto {
    const decodedToken: ITokenPayload = this.jwtService.decode(token) as never
    return decodedToken.user
  }

  retrieveToken(socket: Socket): string {
    SocketIdStorage.set(socket.id)

    if (!socket.handshake.auth.token && !socket.handshake.headers.authorization) {
      throw new WsException(GlobalConfig.socket.noAuthTokenMessage)
    }

    try {
      const token: string = socket.handshake.auth.token
        ? socket.handshake.auth.token.replace('Bearer ', '')
        : socket.handshake.headers.authorization.replace('Bearer ', '')

      if (this.jwtService.verify(token, { ignoreExpiration: false, secret: GlobalConfig.auth.jwtSecret })) {
        return token
      }
    } catch {
      throw new WsException(GlobalConfig.socket.invalidTokenMessage)
    }
  }
}
