import { Length } from 'class-validator'
import { User } from '@prisma/client'

export interface IToken {
  access_token: string
}

export interface ITokenPayload {
  sub: string
  user: UserDto
}

export class UserAuthRequestModel {
  @Length(1, 20)
  login: string

  @Length(1, 64)
  password: string
}

export enum Role {
  Read = 'read',
  Write = 'write',
}

export class UserDto {
  login: string
  role: Role

  public static fromEntity(entity: User): UserDto {
    return {
      login: entity.login,
      role: entity.role as Role,
    }
  }
}
