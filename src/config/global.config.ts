import * as process from 'process'
import pino from 'pino'
import Level = pino.Level
import { Algorithm } from 'jsonwebtoken'

interface IEnvironmentConfig {
  isDevelopment: boolean
  isProduction: boolean
}

interface ISocketConfig {
  roomName: string
  emitAirMeasurementEvent: string
  emitGroundTemperatureEvent: string
  emitWindMeasurementEvent: string
  emitRainfallEvent: string
  noAuthTokenMessage: string
  invalidTokenMessage: string
  exceptionEvent: string
}

interface IServerConfig {
  serverPort: number
}

interface IAuthConfig {
  jwtSecret: string
  jwtExpirationTime: string
  algorithm: Algorithm
  hashSaltRounds: number
  adminUser: string
  adminPassword: string
}

interface ILogConfig {
  level: Level
}

export class Config {
  environment: IEnvironmentConfig
  server: IServerConfig
  auth: IAuthConfig
  log: ILogConfig
  socket: ISocketConfig

  constructor() {
    this.environment = {
      isDevelopment: process.env.NODE_ENV !== 'production',
      isProduction: process.env.NODE_ENV === 'production',
    }
    this.server = {
      serverPort: parseInt(process.env.PORT, 10) || 8081,
    }
    this.auth = {
      jwtSecret: process.env.JWT_SECRET || '123456',
      jwtExpirationTime: process.env.JWT_EXPIRATION_TIME || '1d',
      algorithm: 'HS256',
      hashSaltRounds: 12,
      adminUser: process.env.ADMIN_USER || 'admin',
      adminPassword: process.env.ADMIN_PASSWORD || 'admin',
    }
    this.log = { level: (process.env.LOG_LEVEL as Level) || 'debug' }
    this.socket = {
      exceptionEvent: 'exception',
      emitAirMeasurementEvent: 'emitAirMeasurement',
      emitGroundTemperatureEvent: 'emitGroundTemperature',
      emitWindMeasurementEvent: 'emitWindMeasurement',
      emitRainfallEvent: 'emitRainfall',
      roomName: 'room',
      noAuthTokenMessage: 'No auth token provided',
      invalidTokenMessage: 'Invalid token',
    }
  }
}

const globalConfigInstance: Config = new Config()
export { globalConfigInstance as GlobalConfig }
