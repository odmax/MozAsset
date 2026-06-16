import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === 'production',
  tracesSampleRate: 0,
  beforeSend(event) {
    if (event.request?.data) {
      delete (event.request.data as any).password;
      delete (event.request.data as any).token;
      delete (event.request.data as any).apiKey;
    }
    return event;
  },
});
