import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { UserDto } from '../model/model.model'

export const UserDecorator = createParamDecorator((data: unknown, ctx: ExecutionContext): UserDto | undefined => {
  const { userFromToken } = ctx.switchToHttp().getRequest()
  return userFromToken
})
