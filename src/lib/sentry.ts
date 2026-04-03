import * as Sentry from "@sentry/react";

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
const deploymentUrl = import.meta.env.VITE_DEPLOYMENT_URL;

const traceTargets = [window.location.origin, /^https:\/\/.*\.supabase\.co/];

if (deploymentUrl) {
  traceTargets.push(deploymentUrl);
}

export const sentryEnabled = Boolean(sentryDsn);

export const initSentry = () => {
  if (!sentryEnabled) return;

  Sentry.init({
    dsn: sentryDsn,
    enabled: sentryEnabled,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.2,
    tracePropagationTargets: traceTargets,
    environment: import.meta.env.MODE,
  });
};

export const setSentryUser = (user: { id: string; email?: string | null } | null) => {
  if (!sentryEnabled) return;

  if (!user) {
    Sentry.setUser(null);
    return;
  }

  Sentry.setUser({
    id: user.id,
    email: user.email ?? undefined,
  });
};

export { Sentry };
