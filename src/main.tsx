import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { Sentry, initSentry, sentryEnabled } from "./lib/sentry";

initSentry();

const app = sentryEnabled ? (
  <Sentry.ErrorBoundary fallback={<div className="min-h-screen flex items-center justify-center bg-background text-foreground">Something went wrong.</div>}>
    <App />
  </Sentry.ErrorBoundary>
) : (
  <App />
);

createRoot(document.getElementById("root")!).render(app);
