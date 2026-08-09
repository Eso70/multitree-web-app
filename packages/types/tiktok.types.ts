export interface TikTokUserData {
  client_ip_address?: string;
  client_user_agent?: string;
  email?: string;
  phone?: string;
  ttp?: string; // TikTok Cookie ID
}

export interface TikTokProperties {
  value?: number;
  currency?: string;
  content_type?: string;
  content_id?: string;
}

export interface TikTokEvent {
  event: string;
  event_time: number;
  user?: TikTokUserData;
  properties?: TikTokProperties;
}
