import { Module } from '@nestjs/common'
import { PassportModule } from '@nestjs/passport'
import { CustomStrategy } from '../strategies/custom.strategy'
import { JwtModule } from '@nestjs/jwt'
import { JwtStrategy } from '../strategies/jwt.strategy'
import { GlobalConfig } from '../config/global.config'
import { AuthController } from '../controllers/auth.controller'
import { AuthService } from '../services/auth.service'

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: GlobalConfig.auth.jwtSecret,
      signOptions: { expiresIn: GlobalConfig.auth.jwtExpirationTime, algorithm: GlobalConfig.auth.algorithm },
      verifyOptions: { ignoreExpiration: false, algorithms: [GlobalConfig.auth.algorithm] },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, CustomStrategy, JwtStrategy],
})
export class AuthModule {}
