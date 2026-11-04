/* Inactivity rules shared by the server (lib/portal-auth.ts) and the browser (app/ui/idle-guard.tsx).
   Change IDLE_TIMEOUT_MS to change how long a session can sit idle. */
export const IDLE_TIMEOUT_MS = 10 * 60 * 1000;
/** How long before the timeout the "Are you still there?" warning appears. */
export const IDLE_WARNING_MS = 60 * 1000;
/** The browser tells the server about real activity at most this often. */
export const HEARTBEAT_INTERVAL_MS = 60 * 1000;
