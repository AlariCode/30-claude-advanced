import { IsArray, IsDateString, IsString, MinLength } from 'class-validator'

export class CreateMeetingDto {
  @IsString()
  @MinLength(1)
  title!: string

  @IsDateString()
  date!: string

  @IsArray()
  @IsString({ each: true })
  participants!: string[]
}
