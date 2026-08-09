import {
  IsString,
  IsBoolean,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';

export class LoginDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  username: string;

  @IsString()
  @MinLength(4)
  @MaxLength(128)
  password: string;

  @IsBoolean()
  @IsOptional()
  rememberMe?: boolean;
}
