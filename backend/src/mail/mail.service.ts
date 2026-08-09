import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

type EmailCodeAudience = 'business' | 'admin console' | 'business signup';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter?: Transporter;

  constructor(private readonly config: ConfigService) {}

  async sendBusinessLoginCode(email: string, code: string): Promise<void> {
    await this.sendLoginCode(email, code, 'business');
  }

  async sendAdminLoginCode(email: string, code: string): Promise<void> {
    await this.sendLoginCode(email, code, 'admin console');
  }

  async sendBusinessSignupCode(email: string, code: string): Promise<void> {
    await this.sendLoginCode(email, code, 'business signup');
  }

  private async sendLoginCode(
    email: string,
    code: string,
    audience: EmailCodeAudience,
  ): Promise<void> {
    const user = this.config.get<string>('SMTP_USER')?.trim();
    const password = this.config.get<string>('SMTP_APP_PASSWORD')?.trim();
    if (!user || !password) {
      throw new ServiceUnavailableException(
        'Email login is not configured yet',
      );
    }

    this.transporter ??= nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST', 'smtp.gmail.com'),
      port: this.config.get<number>('SMTP_PORT', 465),
      secure: this.config.get<boolean>('SMTP_SECURE', true),
      auth: { user, pass: password },
    });

    try {
      await this.transporter.sendMail({
        from: {
          name: this.config.get<string>('EMAIL_FROM_NAME', 'MultiTree'),
          address: user,
        },
        to: email,
        subject: `${code} is your MultiTree verification code`,
        text: `Your MultiTree verification code is ${code}. It expires in 10 minutes. Never share this code.`,
        html: `<!doctype html><html><body style="margin:0;background:#f4f6f8;font-family:Arial,sans-serif;color:#172033"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border:1px solid #e5e9ef;border-radius:24px;overflow:hidden"><tr><td style="height:5px;background:#b6f20d"></td></tr><tr><td style="padding:34px"><strong style="font-size:21px">MultiTree</strong><h1 style="margin:28px 0 8px;font-size:25px">Verify your email</h1><p style="color:#657086;line-height:1.6">Use this one-time code to continue to ${audience}.</p><div style="margin:24px 0;padding:22px;text-align:center;background:#f7f9f2;border-radius:18px;font-size:34px;font-weight:800;letter-spacing:10px">${code}</div><p style="color:#7b8495;font-size:13px;text-align:center">Expires in 10 minutes &middot; One use only</p><div style="margin-top:24px;padding:15px;background:#f8fafc;border-radius:14px;color:#657086;font-size:13px;line-height:1.6">Never share this code. MultiTree staff will never ask for it.</div></td></tr></table></td></tr></table></body></html>`,
      });
    } catch (error) {
      this.logger.error('Login email delivery failed', error);
      throw new ServiceUnavailableException('Login code could not be sent');
    }
  }
}
