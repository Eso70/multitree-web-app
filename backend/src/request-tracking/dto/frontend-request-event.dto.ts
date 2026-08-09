import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class FrontendRequestEventDto {
  @Matches(/^[A-Z]{1,10}$/)
  method: string;

  @IsString()
  @MaxLength(500)
  path: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  requestId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  subdomain?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  ipAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  userAgent?: string;
}
