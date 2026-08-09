import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateSignupInvitationDto {
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;
}

export class ConsumeAuthHandoffDto {
  @IsString()
  @MinLength(32)
  @MaxLength(100)
  code: string;
}

export class RequestEmailCodeDto {
  @IsEmail()
  @MaxLength(255)
  email: string;
}

export class VerifyEmailCodeDto {
  @IsString()
  @MinLength(32)
  @MaxLength(100)
  challengeId: string;

  @IsString()
  @Matches(/^\d{6}$/)
  code: string;

  @IsOptional()
  @IsBoolean()
  rememberDevice?: boolean;
}

export class UpdateSignupApplicationDto {
  @IsString() @MinLength(2) @MaxLength(150) businessName: string;
  @IsString() @MinLength(7) @MaxLength(30) phone: string;
  @IsString()
  @Matches(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/)
  requestedSubdomain: string;
}

export class ReviewSignupApplicationDto {
  @IsIn(['request_changes', 'reject', 'approve'])
  action: 'request_changes' | 'reject' | 'approve';
  @IsOptional() @IsString() @MaxLength(1000) reason?: string;
  @IsOptional() @IsUUID() subscriptionPlanId?: string;
  @IsOptional() @IsBoolean() phoneVerified?: boolean;
}
