import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { WEBSITE_COLOR_PATTERN } from '../../common/website-color';

const UPLOADED_IMAGE = /^\/images\/upload\//;
const WEBSITE_COLOR = WEBSITE_COLOR_PATTERN;

export class UpdateBusinessOnboardingDto {
  @IsInt()
  @Min(1)
  @Max(2)
  step: number;

  @IsOptional() @IsString() @Matches(UPLOADED_IMAGE) logo?: string;
  @IsOptional() @IsString() @Matches(UPLOADED_IMAGE) favicon?: string;
  @IsOptional()
  @IsString()
  @Matches(UPLOADED_IMAGE)
  defaultAvatar?: string;
  @IsOptional() @IsString() @Matches(WEBSITE_COLOR) websiteColor?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(150) name?: string;
  @IsOptional() @IsString() @Matches(/^\+?[0-9][0-9\s-]{6,29}$/) phone?: string;
  @IsOptional() @IsArray() tiktokConfigs?: unknown[];
  @IsOptional() @IsString() @MaxLength(255) footerText?: string;
  @IsOptional() @IsString() @MaxLength(50) footerPhone?: string;
}

export class CompleteBusinessOnboardingDto {}
