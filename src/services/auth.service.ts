import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { IToken, ITokenPayload, UserDto } from '../model/auth.model'
import { User } from '@prisma/client'
import prisma from '../db/prismaClient.db'

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async auth(user: UserDto): Promise<IToken> {
    const tokenPayload: ITokenPayload = { sub: user.login, user: user }
    return {
      access_token: await this.jwtService.signAsync(tokenPayload),
    }
  }

  async getUserByLogin(login: string): Promise<User> {
    return prisma.user.findUnique({ where: { login: login } })
  }
}
