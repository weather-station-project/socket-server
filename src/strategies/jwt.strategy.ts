import { ExtractJwt, Strategy } from 'passport-jwt'
import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { GlobalConfig } from '../config/global.config'
import { Request } from 'express'
import { ITokenPayload } from '../model/auth.model'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      jsonWebTokenOptions: { ignoreExpiration: false },
      secretOrKey: GlobalConfig.auth.jwtSecret,
      passReqToCallback: true,
    })
  }

  async validate(req: Request, tokenPayload: ITokenPayload): Promise<boolean> {
    // Assign a user to the request to use it in the handlers
    req['userFromToken'] = tokenPayload.user

    // This method is executed once the token is valid, hence we don't need to validate anything else.
    return true
  }
}
