import * as process from 'process'
import pino from 'pino'
import Level = pino.Level
import { Algorithm } from 'jsonwebtoken'

interface IEnvironmentConfig {
  isDevelopment: boolean
  isProduction: boolean
}

interface ISocketLiteralsConfig {
  sendMeasurement: string
}

interface IServerConfig {
  serverPort: number
}

interface IAuthConfig {
  jwtSecret: string
  jwtExpirationTime: string
  algorithm: Algorithm
  hashSaltRounds: number
}

interface ILogConfig {
  level: Level
}

export class Config {
  environment: IEnvironmentConfig
  server: IServerConfig
  auth: IAuthConfig
  log: ILogConfig
  socketLiterals: ISocketLiteralsConfig

  constructor() {
    this.environment = {
      isDevelopment: process.env.NODE_ENV !== 'production',
      isProduction: process.env.NODE_ENV === 'production',
    }
    this.server = {
      serverPort: parseInt(process.env.PORT, 10) || 8080,
    }
    this.auth = {
      jwtSecret: process.env.JWT_SECRET || '123456',
      jwtExpirationTime: process.env.JWT_EXPIRATION_TIME || '1d',
      algorithm: 'HS256',
      hashSaltRounds: 12,
    }
    this.log = { level: (process.env.LOG_LEVEL as Level) || 'debug' }
    this.socketLiterals = {
        sendMeasurement: 'sendMeasurement',
    }
  }
}

const globalConfigInstance: Config = new Config()
export { globalConfigInstance as GlobalConfig }
