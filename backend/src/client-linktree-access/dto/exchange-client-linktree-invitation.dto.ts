import { IsString, Matches } from 'class-validator';

export class ExchangeClientLinktreeInvitationDto {
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{40,100}$/)
  token: string;

  @IsString()
  @Matches(/^\d{6}$/)
  pin: string;
}
