import { IsOptional, IsString, MaxLength } from 'class-validator';

export class StartImpersonationDto {
  /**
   * Optional free-text support reason stored on the session row.
   */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
