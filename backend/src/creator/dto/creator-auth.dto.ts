import { IsIn } from 'class-validator';

export class StartCreatorGoogleAuthDto {
  @IsIn(['login', 'signup'])
  intent: 'login' | 'signup';
}
