import { Module } from '@nestjs/common'
import { AuthModule } from './auth.module'
import { CommunicationsGateway } from '../gateways/communications.gateway'

@Module({
  imports: [AuthModule],
  providers: [CommunicationsGateway],
})
export class CommunicationsModule {}
