export interface SocialLink {
  id: string;
  platform: string;
  url: string;
  value?: string;
  countryCode?: string;
  displayName?: string;
  customColor?: string;
  customIcon?: string;
  enabled: boolean;
  order?: number;
}
