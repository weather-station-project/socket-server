import { isDate, IsEnum, IsNumber, registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator'
import { Type } from 'class-transformer'

export enum WindDirection {
  N = 'N',
  NNE = 'N-NE',
  NE = 'N-E',
  ENE = 'E-NE',
  E = 'E',
  ESE = 'E-SE',
  SE = 'S-E',
  SSE = 'S-SE',
  S = 'S',
  SSW = 'S-SW',
  SW = 'S-W',
  WSW = 'W-SW',
  W = 'W',
  WNW = 'W-NW',
  NW = 'N-W',
  NNW = 'N-NW',
}

export class MeasurementsRequestModel {
  @IsValidDateInThePast()
  @Type(() => Date)
  fromDate: Date

  @IsValidDateInThePast()
  @Type(() => Date)
  toDate: Date
}

function IsValidDateInThePast(validationOptions?: ValidationOptions) {
  return function (object: NonNullable<unknown>, propertyName: string) {
    registerDecorator({
      name: 'IsValidDate',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: Date): boolean {
          if (!isDate(value)) {
            return false
          }

          return value <= new Date()
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} is not a valid datetime in the past`
        },
      },
    })
  }
}

export interface IMeasurements {
  airMeasurements: AirMeasurementDto[]
  groundTemperatures: GroundTemperatureDto[]
  windMeasurements: WindMeasurementDto[]
  rainfalls: RainfallDto[]
}

class MeasurementDto {
  @IsValidDateInThePast()
  @Type(() => Date)
  dateTime: Date
}

export class GroundTemperatureDto extends MeasurementDto {
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 0 })
  temperature: number
}

export class AirMeasurementDto extends MeasurementDto {
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 0 })
  temperature: number

  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 0 })
  humidity: number

  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 0 })
  pressure: number
}

export class WindMeasurementDto extends MeasurementDto {
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 0 })
  speed: number

  @IsEnum(WindDirection)
  direction: WindDirection
}

export class RainfallDto extends MeasurementDto {
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 0 })
  amount: number
}
