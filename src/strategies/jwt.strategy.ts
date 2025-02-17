import { Strategy } from 'passport-jwt'
import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { GlobalConfig } from '../config/global.config'
import { Socket } from 'socket.io'
import { AuthService } from '../services/auth.service'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(authService: AuthService) {
    super({
      jwtFromRequest: (socket: Socket) => {
        return authService.retrieveToken(socket)
      },
      jsonWebTokenOptions: { ignoreExpiration: false },
      secretOrKey: GlobalConfig.auth.jwtSecret,
    })
  }

  async validate(): Promise<boolean> {
    return true
  }
}
