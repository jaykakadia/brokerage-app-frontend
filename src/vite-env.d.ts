/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_APP_NAME?: string;
  readonly VITE_PROXY_TARGET?: string;
  readonly VITE_UPLOADS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface CashfreeCheckoutResult {
  error?: { message?: string };
  redirect?: boolean;
  paymentDetails?: { paymentMessage?: string };
}

interface CashfreeInstance {
  checkout(options: {
    paymentSessionId: string;
    redirectTarget?: '_self' | '_blank' | '_top' | '_modal' | HTMLElement;
  }): Promise<CashfreeCheckoutResult>;
}

interface Window {
  Cashfree?: (options: { mode: 'sandbox' | 'production' }) => CashfreeInstance;
}
