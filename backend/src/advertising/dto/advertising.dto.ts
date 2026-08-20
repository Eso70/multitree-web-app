import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

/**
 * Every list is bounded and every nested object is a declared class, so the
 * global `forbidNonWhitelisted` pipe rejects unknown properties instead of
 * dropping them silently. Lengths match the editor's own `maxLength` values
 * and the column widths, so a value the UI accepts is never rejected here.
 */

const RESULT_COLORS = [
  'rose',
  'indigo',
  'amber',
  'emerald',
  'sky',
  'violet',
  'orange',
  'cyan',
] as const;

const TESTIMONIAL_COLORS = [
  'orange',
  'rose',
  'emerald',
  'violet',
  'sky',
  'amber',
  'cyan',
  'fuchsia',
] as const;

/** A preset colour name or an explicit hex, matching the column's CHECK. */
const CATEGORY_COLOR =
  /^(#[0-9A-Fa-f]{6}|lime|violet|amber|cyan|rose|blue|fuchsia|emerald)$/;

/**
 * The editor's own key for a row. Generated client-side as
 * `<prefix>-<timestamp>-<random>`, so it is constrained to the safe characters
 * that shape produces rather than accepting arbitrary text as an identifier.
 */
const ITEM_KEY = /^[A-Za-z0-9._-]{1,120}$/;

/** Uploaded or pasted media. Relative paths are ours; absolute must be HTTP(S). */
const MEDIA_URL = /^(https?:\/\/|\/)[^\s]*$/;

export class AdvertisingSectionsDto {
  @IsBoolean() hero!: boolean;
  @IsBoolean() journey!: boolean;
  @IsBoolean() results!: boolean;
  @IsBoolean() packages!: boolean;
  @IsBoolean() testimonials!: boolean;
  @IsBoolean() faq!: boolean;
  @IsBoolean() closingCta!: boolean;
}

export class AdvertisingClosingCtaDto {
  @IsString() @MaxLength(90) title!: string;
  @IsString() @MaxLength(160) description!: string;
  @IsString() @MaxLength(40) buttonLabel!: string;
}

export class AdvertisingPriceRowDto {
  @IsString() @Matches(ITEM_KEY) id!: string;
  @IsNumber() @Min(0) @Max(1_000_000_000) price!: number;
  @IsString() @MaxLength(40) views!: string;
}

export class AdvertisingPackageCategoryDto {
  @IsString() @Matches(ITEM_KEY) id!: string;
  @IsString() @MaxLength(30) label!: string;
  @IsOptional() @IsString() @Matches(CATEGORY_COLOR) color?: string;
  /**
   * The category's own tiers, sent with it rather than in a parallel map. The
   * editor holds them as `Record<categoryId, tiers[]>`, which can carry an
   * entry for a category that is not in the list; nesting them makes that
   * unrepresentable.
   */
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => AdvertisingPriceRowDto)
  tiers!: AdvertisingPriceRowDto[];
}

export class AdvertisingResultDto {
  @IsString() @Matches(ITEM_KEY) id!: string;
  @IsString() @MaxLength(40) category!: string;
  @IsString() @MaxLength(12) before!: string;
  @IsString() @MaxLength(12) after!: string;
  @IsNumber() @Min(0) @Max(1_000_000_000) price!: number;
  @IsIn(RESULT_COLORS) color!: (typeof RESULT_COLORS)[number];
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  @Matches(MEDIA_URL)
  beforeImageUrl?: string;
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  @Matches(MEDIA_URL)
  afterImageUrl?: string;
}

export class AdvertisingTestimonialDto {
  @IsString() @Matches(ITEM_KEY) id!: string;
  @IsString() @MaxLength(40) name!: string;
  @IsString() @MaxLength(40) role!: string;
  @IsString() @MaxLength(280) quote!: string;
  @IsIn(TESTIMONIAL_COLORS) color!: (typeof TESTIMONIAL_COLORS)[number];
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  @Matches(MEDIA_URL)
  avatarUrl?: string;
}

export class AdvertisingFaqDto {
  @IsString() @Matches(ITEM_KEY) id!: string;
  @IsString() @MaxLength(140) question!: string;
  @IsString() @MaxLength(500) answer!: string;
}

export class AdvertisingPaymentProviderDto {
  @IsString() @Matches(ITEM_KEY) id!: string;
  @IsString() @MaxLength(30) name!: string;
  @IsString() @MaxLength(30) phone!: string;
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  @Matches(MEDIA_URL)
  logoUrl?: string;
}

/**
 * A partial save. Each editor tab sends only its own slice, so every field is
 * optional — but a field that is present is sent whole, and the service
 * reconciles the list against what is stored.
 */
export class SaveAdvertisingDto {
  @IsOptional() @IsString() @MaxLength(90) title?: string;
  @IsOptional() @IsString() @MaxLength(280) description?: string;
  /**
   * Accepts what the field collects, including spaces and a leading `+`; the
   * service strips to digits before storing.
   */
  @IsOptional() @IsString() @MaxLength(30) whatsappNumber?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AdvertisingSectionsDto)
  sections?: AdvertisingSectionsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AdvertisingClosingCtaDto)
  closingCta?: AdvertisingClosingCtaDto;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => AdvertisingPackageCategoryDto)
  packageCategories?: AdvertisingPackageCategoryDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => AdvertisingResultDto)
  results?: AdvertisingResultDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => AdvertisingTestimonialDto)
  testimonials?: AdvertisingTestimonialDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => AdvertisingFaqDto)
  faqs?: AdvertisingFaqDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => AdvertisingPaymentProviderDto)
  paymentProviders?: AdvertisingPaymentProviderDto[];

  /** Empty string clears the configured video. */
  @IsOptional()
  @ValidateIf((_object, value) => value !== '')
  @IsString()
  @MaxLength(2048)
  @Matches(MEDIA_URL)
  videoUrl?: string;

  @IsOptional() @IsString() @MaxLength(90) videoTutorialTitle?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(300, { each: true })
  tutorialSteps?: string[];

  /** `null` clears the configured receipt example image. */
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  @Matches(MEDIA_URL)
  receiptExampleImageUrl?: string | null;
}
