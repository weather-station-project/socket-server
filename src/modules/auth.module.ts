import { Module } from '@nestjs/common'
import { PassportModule } from '@nestjs/passport'
import { JwtModule } from '@nestjs/jwt'
import { JwtStrategy } from '../strategies/jwt.strategy'
import { GlobalConfig } from '../config/global.config'
import { AuthService } from '../services/auth.service'

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: GlobalConfig.auth.jwtSecret,
      verifyOptions: { ignoreExpiration: false, algorithms: [GlobalConfig.auth.algorithm] },
    }),
  ],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
