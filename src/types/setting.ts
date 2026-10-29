export interface MailSettings {
  smtp_host?: string;
  smtp_email?: string;
  smtp_port?: number;
  smtp_encryption?: 'ssl' | 'tls' | string;
  from_name?: string;
  has_password?: boolean;
  host?: string;
  email?: string;
  port?: number;
  encryption?: string;
}

export interface MailSettingsUpdate {
  smtp_host?: string;
  smtp_email?: string;
  smtp_password?: string;
  smtp_port?: number;
  smtp_encryption?: string;
  from_name?: string;
  host?: string;
  email?: string;
  port?: number;
  encryption?: string;
  password?: string;
}

export interface TestMailRequest {
  test_email: string;
}

export interface SignupGuideSettings {
  blog_url: string;
  video_url: string;
}

export interface SocialLinksSettings {
  facebook_url?: string;
  instagram_url?: string;
  youtube_url?: string;
  linkedin_url?: string;
  x_url?: string;
  gbp_url?: string;
  whatsapp_number?: string;
  support_email?: string;
}
