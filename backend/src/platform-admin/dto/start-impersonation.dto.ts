import { IsOptional, IsString, MaxLength } from 'class-validator';

export class StartImpersonationDto {
  /**
   * Optional free-text support reason, stored on the session row and on the
   * audit event so a later review can tell why the dashboard was opened.
   */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
