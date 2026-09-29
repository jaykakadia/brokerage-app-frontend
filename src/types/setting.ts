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
