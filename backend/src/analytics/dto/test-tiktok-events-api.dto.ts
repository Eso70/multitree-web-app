import { IsIn, IsOptional, IsString, Matches } from 'class-validator';

export const TIKTOK_TEST_EVENTS = [
  'ViewContent',
  'Contact',
  'ClickButton',
] as const;

export type TikTokTestEventName = (typeof TIKTOK_TEST_EVENTS)[number];

export class TestTikTokEventsApiDto {
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{4,64}$/, {
    message:
      'test_event_code must be between 4 and 64 alphanumeric characters (e.g. TEST77408)',
  })
  test_event_code: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{8,255}$/, {
    message: 'Invalid TikTok Pixel ID format',
  })
  pixel_id?: string;

  @IsOptional()
  @IsString()
  @IsIn(TIKTOK_TEST_EVENTS, {
    message:
      'Invalid TikTok event name (allowed: ViewContent, Contact, ClickButton)',
  })
  event_name?: TikTokTestEventName;
}
