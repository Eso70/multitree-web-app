import {
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

/**
 * One public submission of a mini website's lead form.
 *
 * The visitor and session ids are the same ones the page already uses for
 * analytics, so a submission joins the visit it came from rather than arriving
 * as an anonymous row with no attribution.
 */
export class SubmitMiniWebsiteLeadDto {
  /**
   * The id the browser already fired its TikTok `Lead` under.
   *
   * Accepted from the client on purpose, and it is the one field here that has
   * to be: TikTok collapses the browser event and the server event into a
   * single conversion only when both carry the same id, and only the browser
   * can tell us which one it used. It is an opaque correlation token — the
   * ingest treats it as a deduplication key and never as an identity — so the
   * worst a forged value does is drop a duplicate of the caller's own event.
   * Optional so an older cached page still submits successfully; without it
   * the server mints its own and the lead is simply server-only.
   */
  @IsOptional()
  @IsString()
  @Length(8, 128)
  eventId?: string;

  @IsString()
  @Length(8, 128)
  visitorId: string;

  @IsString()
  @Length(8, 128)
  sessionId: string;

  /**
   * Answers keyed by the field id the business configured. Values are strings,
   * or booleans for checkbox questions; the service coerces and length-checks
   * each one against its field before anything is stored.
   */
  @IsObject()
  answers: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  consent?: boolean;

  /**
   * A field no human sees. Browsers leave it empty; the crawlers and scripted
   * submitters that fill every input on a page do not.
   */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  pageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  referrer?: string;
}
