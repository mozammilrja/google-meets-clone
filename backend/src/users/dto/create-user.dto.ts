import { IsEmail, IsString, MinLength, IsArray } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  name!: string;

  @IsString()
  @MinLength(6)
  passwordHash!: string;

  @IsArray()
  roles!: string[];
}
