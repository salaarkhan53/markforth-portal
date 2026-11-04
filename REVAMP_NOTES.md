# Agent portal revamp: what changed and how to deploy

This build restyles the portal to match markforthsol.com, makes it easier for first-time users, and adds a 10-minute inactivity logout that the server enforces. Business logic, permissions, the origin check, throttling, the Supabase flow, email delivery and data handling are unchanged. The only API additions are the inactivity `heartbeat`, the self-service `profile` action and the current-password check (see below). No dependencies were added or upgraded.

## Before you deploy

1. **Apply migrations `drizzle/0010_volatile_fat_cobra.sql` and `drizzle/0011_awesome_cardiac.sql`** to the production D1 database, in that order. They add two nullable columns: `auth_sessions.last_activity_at` and `members.dob`. Earlier migrations are untouched.
2. **Everyone signs in once more.** Existing sessions have no activity timestamp, so the server treats them as expired. This is intentional.
3. Run the usual checks: `pnpm exec tsc --noEmit`, every file in `tests/`, and `pnpm run build`.

## Inactivity logout

- The limit is one constant: `IDLE_TIMEOUT_MS` in `lib/session-config.ts` (currently 10 minutes). The warning time and heartbeat interval sit next to it. The login message and welcome tour read the same value.
- **Server** (`lib/portal-auth.ts`): `session()` deletes the session row and clears the cookie when `now - lastActivityAt` exceeds the limit. Only sign-in and the new `heartbeat` action on `/api/auth` move `lastActivityAt` forward. Normal API calls and background polling never do.
- **Browser** (`app/ui/idle-guard.tsx`):
  - Counts only real activity: pointer, keys, scroll and touch.
  - Sends a heartbeat at most once a minute while the user is active.
  - Shows a warning with a countdown one minute before the limit.
  - Then redirects to `/login?reason=idle`.
  - Tabs share activity and logout through BroadcastChannel, with a localStorage fallback.
  - Sleep and hidden tabs are handled by comparing timestamps.
  - Any `401` from `/api/*` also redirects to sign-in.
- **Workspace-owner (ChatGPT) sessions** have no portal session row, so the browser enforces their timeout and redirects to `/signout-with-chatgpt?return_to=/login?reason=idle`.

## Interface

- **Design tokens:** in `app/globals.css`, with the Cabinet Grotesk and General Sans fonts self-hosted in `public/fonts/`. Tailwind is enabled without its CSS reset. Utilities are generated only for files listed with `@source`; add a line there when you start using another `components/ui` file.
- **New UI files in `app/ui/`:**
  - `app-shell.tsx`: sidebar, top bar, user menu, mobile menu, Log out
  - `boot-screen.tsx`: loading skeleton and error card
  - `simple-dialog.tsx`: accessible dialog wrapper
  - `welcome-tour.tsx`: first-login tour, for agents only
  - `idle-guard.tsx`: the inactivity logout
- **Messages and dialogs:** toasts replace the banners at the top of the page. All dialogs use Radix, so they close on Esc, keep keyboard focus inside, and return focus to whatever opened them.
- **Logo:** `public/brand/markforth-logo-onblack.png` was added for dark backgrounds. The original logo and emblem are unchanged.

## Profile menu (added after the revamp)

- **Profile menu order:** name with the role label and email, then Edit profile, Change password, Take the tour again (agents only), Log out. The old "Account security" sidebar item was removed.
- **Edit profile:** `profile` action on `/api/portal`. Any active member can change their own name, optional date of birth and optional photo, and never anyone else's. Photos must be at most 2 MB before upload. They are stored like admin-uploaded agent photos (a 320 px JPEG).
- **Change password:** `/api/auth` `changePassword` now requires the current password, except for the first sign-in with a temporary password and recovery links. Wrong attempts are rate-limited like sign-in.
- **Leaderboard:** the Leaderboard tab shows the podium plus a Top 10 list. The Overview keeps the podium only.

## Tests

- `tests/idle.test.mjs` (new) covers the idle limit, the heartbeat, polling not extending a session, sessions with no timestamp, and the owner fallback.
- `tests/auth.test.mjs` now also loads the new session pieces and checks the current-password rule.
- `tests/portal.test.mjs` covers the self-service profile: own record only, name, date-of-birth and photo rules, and the origin check.
