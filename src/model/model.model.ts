export interface IToken {
  access_token: string
}

export interface ITokenPayload {
  sub: string
  user: UserDto
}

export interface ICustomException {
  status: string
  message: string
}

export enum Role {
  Read = 'read',
  Write = 'write',
}

export class UserDto {
  login: string
  role: Role
}

export function getUserFromSocketData(socketData: unknown): UserDto {
  return socketData as UserDto
}
