import { useEffect, useState } from 'react';
import axios from 'axios';

/** Matches the backend's wait between OTP emails to the same address. */
export const OTP_RESEND_SECONDS = 60;

/** Seconds the server asked us to wait (429 Retry-After), or null for any other error. */
export function retryAfterSeconds(error: unknown): number | null {
  if (!axios.isAxiosError(error) || error.response?.status !== 429) return null;
  const seconds = Number(error.response.headers?.['retry-after']);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : OTP_RESEND_SECONDS;
}

/** Countdown for a "Send OTP" button so people see when they can resend. */
export function useResendCooldown() {
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (until <= Date.now()) return;
    const timer = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= until) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [until]);

  return {
    secondsLeft: Math.max(0, Math.ceil((until - now) / 1000)),
    start: (seconds: number = OTP_RESEND_SECONDS): void => {
      const t = Date.now();
      setNow(t);
      setUntil(t + seconds * 1000);
    },
    reset: (): void => setUntil(0)
  };
}
