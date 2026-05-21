import { IsString, MinLength } from 'class-validator'

export class ChangePasswordDto {
  @IsString()
  oldPassword!: string

  @IsString()
  @MinLength(8)
  newPassword!: string
}
