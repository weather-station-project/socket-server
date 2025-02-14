import { HealthCheck, HealthCheckResult, HealthCheckService } from '@nestjs/terminus'
import { Controller, Get } from '@nestjs/common'
import {SocketHealthIndicator} from "../indicators/socket.indicator";

@Controller({ path: 'health' })
export class HealthController {
  constructor(
      private readonly healthCheckService: HealthCheckService,
      private readonly socketHealthIndicator: SocketHealthIndicator
  ) {}

  @Get()
  @HealthCheck()
  async check(): Promise<HealthCheckResult> {
    return this.healthCheckService.check([() => this.socketHealthIndicator.isHealthy('socketServerAvailable')])
  }
}
