# vinext-starter

A clean full-stack starter running on [vinext](https://github.com/cloudflare/vinext), with optional Cloudflare D1 and Drizzle support.

## Prerequisites

- Node.js `>=22.13.0`
- Portable: Windows, macOS, or Linux; no Bash required
- Managed Linux: managed Linux runtime with Bash, `flock`, `curl`, `sha256sum`, and GNU `timeout`
- Git and `tar` (including Windows `tar.exe`) are required for publishing; portable publication does not require Bash

## Sites Lifecycle

The Sites initializer copies the shared starter and selects managed-linux only when `SITES_MANAGED_LINUX_CONTAINER=1`; otherwise it selects portable. It saves the selection only in ignored `.sites-runtime/execution-profile.json`. Both profiles copy/configure first, then use the plugin's separate `install-dependencies.mjs` step to measure installation independently. Edit source under `app/` and follow the Sites skill for installation, preview, builds, and publishing.

Run `node <plugin-root>/scripts/configure-execution-profile.mjs` only when the profile is unknown for the current checkout and environment. Profile changes do not alter tracked source or require reinstalling otherwise-valid dependencies; restart an existing preview to use the new selection. Do not commit or upload `.sites-runtime/`.

This starter does not use `wrangler.jsonc`.

Publish archives outside the source checkout or under its ignored `outputs/` directory. Local `.env*`, `.dev.vars*`, TypeScript build state, and tool runtime directories are ignored; keep the hosting manifest, migrations, and authored scripts in source control.

`install:ci` runs `npm ci` once against the shared lockfile, disables parent-workspace discovery, and includes required dev/optional dependencies despite production/omit settings. Sharp defaults to prebuilt binaries unless explicitly configured otherwise. Do not overlap installers.

- **Portable:** Preserve host HOME, npm cache, registry, proxy, temporary paths, retry/concurrency settings, and lifecycle-script policy. Use `--prefer-offline --no-audit --no-fund`.
- **Managed Linux:** Use the existing project-local HOME/cache/tmp setup and Linux install lock, tarball preflight, and timeout. Restore the image-seeded npm cache only when its lockfile hash matches; retain network fallback. Builds keep their existing timeout. These helpers are not invoked by the portable profile.

`scripts/sites-env.mjs` preserves the caller's HOME, npm cache, proxy, XDG, and temporary-directory configuration while defaulting Wrangler and Miniflare state to the checkout. If npm reports an unwritable cache, select a writable path with `npm_config_cache` for that install. The `dev` and `start` scripts also keep Wrangler logs inside the checkout. Generated `.sites-runtime/` and `.wrangler/` directories are disposable and ignored by Git.

On portable, `npm run dev` uses `vinext dev` with HMR, starting at port 5173. Vinext records the running server in ignored `.vinext/` state, rejects an ordinary duplicate launch, and recovers stale state after a stopped process; exactly simultaneous starts can race. Pass `--port <port>` or `--hostname <host>` after `npm run dev --` when needed; keep portable previews on loopback.

For managed Linux browser QA, follow the Sites skill's managed preview reference. The daemon runs the project's Vite dev script with `--host 0.0.0.0 --port 4173 --strictPort`; use the CLI's returned URL. The ignored local profile survives the daemon's cleared environment.

The portable profile simulates ChatGPT sign-in only for loopback development requests. Visit `/signin-with-chatgpt?return_to=/` to sign in as `local_seedy` (`seedy@sites.test`, display name `Seedy`) and `/signout-with-chatgpt?return_to=/` to sign out. The development cookie preserves that identity across server restarts. Mock auth is disabled in the managed-linux profile and is not included in production builds; hosted authentication remains dispatch-owned.

The Worker uses `vinext/server/fetch-handler`, including Vinext's config-aware image handling. After building, `npm start` runs that Worker locally through Wrangler on `127.0.0.1`, sharing `.wrangler/state` with dev preview and local D1 migrations; it does not deploy the site or simulate sign-in. Use the URL printed by the server. Pass `npm start -- --port <port>` to select a different built-preview port.

Local previews use Miniflare's placeholder `Request.cf` metadata without a network lookup. Set `CLOUDFLARE_CF_FETCH_ENABLED=true` to opt into fetching preview metadata; this setting does not change hosted request metadata.

Local tool usage metrics are disabled by default. Set `WRANGLER_SEND_METRICS=true` to opt in.

## Included Shape

- edit site code under `app/`
- `app/chatgpt-auth.ts` provides optional dispatch-owned ChatGPT sign-in helpers
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `worker/index.ts` is the production Worker entrypoint and preserves request-scoped connector bindings
- `scripts/vite/` contains the maintained Vite integrations and the vendored Sites plugin license
- `scripts/connector-preview/` contains the local connector preview Worker and session helpers
- the remaining `scripts/` files select execution profiles and run installation, development, and builds; the plugin's helpers orchestrate the Sites lifecycle
- `dist/` contains generated deployment output; `.vinext/`, `.wrangler/`, and `.sites-runtime/` contain ignored local tool state
- `db/index.ts` reads the D1 binding from the Cloudflare Worker environment
- `db/schema.ts` starts intentionally empty
- `@cloudflare/workers-types` provides Worker types; `cloudflare-env.d.ts` declares optional `DB`/`BUCKET` bindings—update these declarations if binding names change
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Workspace Auth Headers

Signed-in visitors receive both `oai-authenticated-user-id` and `oai-authenticated-user-email`. Private Sites require every visitor to sign in; public Sites may also have anonymous visitors, for whom neither header is present.

The user ID is stable for the same user on the same Site and different across Sites. Use it as the durable user key; use email and name for display or contact purposes.

SIWC-authenticated workspace sites may also receive `oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty `name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by `oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const userId = requestHeaders.get("oai-authenticated-user-id");
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use the returned `userId` as the stable user key for user-owned records; do not use email as a durable identifier.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send anonymous visitors through Sign in with ChatGPT.
- In a Server Component, start sign-in with `<a href={chatGPTSignInPath(returnTo)} target="_top">`. The auth helper module is server-only; do not import it into a Client Component.
- Do not use `fetch`, XHR, a client-side router, or a framework link that can prefetch the sign-in route. SIWC must start as a top-level navigation.
- Never request the AuthAPI authorization endpoint directly. The dispatch-owned `/signin-with-chatgpt` route must start the SIWC flow.
- Use `chatGPTSignOutPath(returnTo)` for browser sign-out links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the OAuth cookies, and identity header injection. Do not implement app routes for those reserved paths. Routes that do not import and call the helper remain anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the Sites hosting platform's access policy controls for workspace-wide restrictions, or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write actions tied to the current ChatGPT user. Leave public content anonymous.

## Local D1 migrations

For a D1-backed local preview, generate SQL with `npm run db:generate`. Build once through the Sites skill's build entrypoint (or `npm run build` for standalone use) to generate `dist/server/wrangler.json`, rebuilding if bindings change. From the project root, apply each pending migration in order:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_example.sql
```

Replace the filename with the pending migration and `DB` with your D1 binding name if different. Use `.wrangler/state`, not `.wrangler/state/v3`; Wrangler adds the versioned directories. Do not replay migrations already applied locally. This updates only the preview database; publishing applies production migrations separately.

## Diagnostic Commands

- `npm run install:ci`: perform the one locked dependency install
- `npm run dev`: start the Vite/Vinext development server
- `npm run build`: build the deployable Sites artifact
- `npm run start`: preview the built Worker locally with D1/R2 support
- `npm run db:generate`: generate Drizzle migrations after schema changes

When using the Sites plugin, follow its skill instructions for installation, builds, and publishing. These npm commands remain available for standalone use.

The portable build runs Vinext directly without a host `timeout` command. The managed-linux build uses `scripts/build-verified.sh` and its existing `SITES_BUILD_TIMEOUT` setting.

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)


## Markforth operations

- The portal supports individual Supabase password sign-ins with owner-only ChatGPT fallback. Team roster permissions and the outer Site visitor policy are separate; both currently apply.
- DIDs are trimmed and normalized to uppercase. Daily call totals are keyed by agent, campaign, reporting date, and DID. Historical records without a DID remain unassigned.
- New active members create a welcome-email record and attempt sending immediately if the email sender is configured. Editing a member does not send another welcome email.
- Configure secret `RESEND_API_KEY` and sender `EMAIL_FROM` through Sites runtime environment settings, then deploy to apply them. Verify the sender domain with Resend first. No credentials belong in source, the database, browser bundles, or this README.
- The legacy mail fallback contains ChatGPT instructions. Supabase onboarding uses generated temporary credentials and the secure mailbox sender described below. No password is retained in the email log. Existing members can receive a welcome email from the administrator's Email delivery screen.
- Provider acceptance is distinct from delivery. Blocked or failed records remain visible. Explicit retries reuse a stable provider idempotency key and frozen payload; uncertain outcomes stop retrying after the conservative safe window. Consult provider logs for an uncertain outcome outside that window.
- Tests: `node tests/portal.test.mjs` runs route handlers against SQLite and a fake email provider. No external email is sent by tests. Production delivery requires configured secrets and a real recipient test.


## Sales and performance update

- User deletion archives the membership and immediately revokes portal access; historical leads/calls remain. Administrators can restore archived users. Owner/self deletion is blocked.
- Administrators manage DID dropdown options. Agents submit using an active DID assigned to that campaign and their own account. Administrators may submit on behalf of active members.
- Sale outcomes are independent of legacy approval labels: Pending, Sale, and Not a sale. A confirmed sale also records CPA/CPL approval type. Legacy CPA approvals imply Sale; legacy CPL approvals remain Pending until explicitly reviewed.
- Call-to-transfer percentage = recorded transfers / recorded calls × 100. Transfer-to-sale percentage = confirmed sales / recorded transfers × 100. Zero denominators display an em dash.
- LPD = submitted leads / distinct recorded working days in the selected period. Working days combine lead-submission dates and call-activity dates across all campaigns and DIDs for each agent; call entries with zero leads still count. Team LPD divides team leads by distinct team activity dates. Days use US Eastern reporting dates.
- Branded leaderboard cards are ranked by confirmed sales, then total CPA/CPL approvals, then submitted leads.
- Supabase password accounts and reset controls are described in the section below. Mailbox credentials must be configured before mail can send. Custom-domain DNS/SSL validation does not configure mailbox access or authorize sending.


## Supabase password accounts

The portal now supports Supabase email/password login in addition to the owner's existing ChatGPT access. Site visitor access stays private until the owner explicitly authorizes changing the outer access policy.

- Supabase project: `himrllyhqktiljccafvl`, under the Markforth organization.
- Required Site runtime secrets: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `PORTAL_SESSION_KEY`, `PORTAL_OWNER_EMAIL`. These are configured through Sites; their values must never be committed.
- `markforth-auth-bridge` requires gateway JWT verification and separately validates the user with Supabase Auth. It then requires an active administrator row in a private, RLS-protected directory. It can modify only mapped Markforth accounts. It accepts no shared-secret bypass.
- The owner first creates and confirms a Supabase password login from Team members → Create administrator password login, then signs in at `/login`. A protected database trigger maps the confirmed owner account to the administrator directory only when it carries the one-time registration claim supplied by the existing authenticated Site owner. The claim is hashed in the private configuration, consumed on confirmation and removed from the user profile. Public self-signups do not receive the Markforth application marker and cannot access the portal. Agent accounts are created by administrators only through the portal.
- Site sessions use a random opaque Secure/HttpOnly/SameSite=Lax cookie. Access and refresh tokens are encrypted in D1 with the runtime session key. JWTs, refresh tokens, SMTP passwords and temporary passwords are never sent in GET responses or stored in logs.
- Generated temporary passwords are shown once to the administrator and, when SMTP is configured, emailed directly by the authenticated Edge Function. The portal requires a password change before reading operational data. Password resets revoke the member's existing portal sessions.
- Set the secure mailbox hostname, port 465, full mailbox username, From address and password in Email delivery. The Edge Function verifies TLS credentials and stores them AES-GCM encrypted in its private configuration table; the key is derived from its existing service-role environment secret. A service-key rotation requires re-saving mailbox settings.
- Configure that same mailbox in Supabase Auth → SMTP for Forgot password emails. Set Auth Site URL to `https://agents.markforthsol.com` and allow the `/reset-password` redirect. The recovery page supports both token-hash and standard Supabase recovery sessions and consumes them only on an explicit password form submission.
- Recovery requests return the same response for known and unknown addresses. Login and recovery actions are rate-limited. Agent deletion/disable and admin-role changes synchronize provider authorization before changing local access for provisioned users.
- Tests: `node tests/auth.test.mjs` checks the actual session and auth-route implementations against SQLite and a controlled provider. These tests send no live email. Live owner confirmation, SMTP delivery and agent login require the owner's setup and remain unverified until performed.

### Podium, photographs and power hours

The first three leaderboard places use a bronze / gold / silver podium (3, 1, 2 left to right); fourth place onward retains the existing branded scorecards. Administrators upload or remove photos in Team members. The browser crops to a 320px square JPEG, strips source metadata, and caps the stored image size. Photos are served only to active, authenticated portal members.

Power hour lets administrators publish a title, message, local start/end, campaign, sales target and PKR bonus. The server stores UTC times; viewers see their own local equivalent. Eligibility counts non-imported leads submitted in the half-open time window and confirmed as sales by an administrator, including later approvals. Awards are unique per challenge and agent; repeated reviews cannot create duplicate rewards. Reversing a sale removes eligibility. Cancellation stops new awards. This records earned rewards, not financial payments.

Every open authenticated workspace polls the protected bonus feed every 12 seconds. Announcements and awards remain in an acknowledgement queue until the user marks them seen. Seen IDs are saved per account on the server, including across refreshes and devices. Sound defaults to on. The browser audio context resumes automatically on the first pointer or keyboard interaction when autoplay is restricted; users can mute it. A layered major-chord chime announces each unseen notification once per visit. No background push is sent to closed browsers. Bonus and photograph endpoints reject anonymous, inactive and forced-password-change accounts.

### Lead corrections and account activation

Administrators can edit customer details, phone, campaign, agent, DID and notes from lead details. Edits retain the original submission timestamp and return approval to Pending; bonuses are recalculated. Delete moves a lead into a recoverable Deleted leads view and excludes it from reporting. Restore returns it to reporting. Agents cannot use these administrative operations.

Initial password management still requires the workspace owner to create and confirm their administrator password account. There are no provisioned Supabase password users until that step is completed. Configure info@markforthsol.com in Supabase Auth SMTP before confirmation/recovery; use the actual mailbox password, secure hostname and port 465. Then sign in with the confirmed administrator password and configure the same mailbox under Email delivery for credential emails. The portal never guesses or stores a mailbox password in source. Creating a roster record is distinct from provisioning its password login, and blocked provisioning now shows its actual setup requirement.

### Permanent account deletion

Administrators can permanently delete only archived, disabled users after typing the exact email address. Owner and self deletion are blocked in both the portal and authentication service. Portal sessions are revoked before removing the Supabase auth user; directory records cascade there. The portal removes the member, invitation, photo, sessions and acknowledgement data, and retains an audit event. Historical business leads, call totals and earned bonus history remain for reporting. Provisioned auth deletion requires an active administrator password session. This is an irreversible account operation; the UI requires a dedicated confirmation form. No production user was deleted during development or testing.

### Markforth Connect team chat

Updates automatically includes every active portal user. All other groups require explicit membership, enforced on message reads, writes, reactions and file downloads. A one-time bootstrap enrolls existing admins in pre-existing groups; new private groups start with their creator. Admins appoint group moderators who can manage membership and moderate messages in their groups. Updates membership cannot be removed. Permanent user deletion clears chat membership and read state.

Chat supports quoted replies, six emoji reactions, mentions restricted to current group members, unread counts and agent photos. The Markforth sticker club offers 60 branded vector stickers across eight packs: Big wins, Shift life, Desi dialogues, Floor memes, Shabaash, Power hour, Mood and Chai break, stored as allowlisted message markers. A compact searchable modal is portalled to the document body, constrained to the viewport, and uses a single scrollable sticker grid; the original red emblem with its black lower leg stays visible on white. Authors can edit text or remove their messages. Group moderators can remove messages; removal clears text and blocks attachment access.

Files use private R2 storage behind authenticated endpoints: five files per message, 10 MB each. Same-group membership is checked on every download; unpublished uploads are restricted to their uploader. Only signature-verified JPEG, PNG, GIF and WebP files render inline; other formats force download. Staged uploads can be removed before sending. No public object keys or mailbox addresses are returned to clients.

The selected conversation polls every five seconds while visible; workspace-wide unread and incoming message sound checks run every ten seconds (background tabs may be throttled by browsers). Incoming sounds share the portal mute control and need a browser interaction to unlock audio. Initial backlog does not play sounds. Earlier history loads in pages of 60. Read positions advance only near the bottom of a visible conversation. Origin checks and per-action rate limits protect writes. Automated tests use isolated SQLite and mock storage; disposable browser fixtures are removed before packaging.

### Bulk lead review

Admins can select individual active leads or the first 100 filtered leads in Lead pipeline, then mark the selection as Sale (CPA/CPL), Rejected, or Pending with one click. Rejections require a shared reason. Changing filters clears selection; deleted leads cannot be bulk-reviewed. The server validates the full selection before writing, groups updates and the audit record in one D1 batch, records reviewer/time, and recalculates power-hour awards once.

### Employee onboarding

Administrator-only workspace at `/onboarding`, linked from the portal sidebar. Track employee contact and employment details, joining stages, editable checklists, and internal notes. Records are independent from portal account provisioning; optional roster autofill copies only name and email. Archive/restore retains records and letter history. Directory CSV export escapes spreadsheet formula prefixes.

Company settings control the legal name, office/contact details, authorized signatory and reusable appointment terms. Review these details before use. The letter studio requires designation, joining date, monthly base salary, working hours/location, date and signatory, then saves an immutable snapshot with a unique reference and idempotent request key. Print the A4 letter or use the browser's Save as PDF. Signatures are completed separately; generating a letter neither emails it nor creates an employment decision. Later edits do not change previously generated letters.

Private employee documents (10 MB each) use R2 behind administrator-authenticated forced-download endpoints. All reads, writes and letter/file downloads require an active administrator without a pending forced password change. Mutations validate origin, rate limits, lengths and optimistic record revision; stale updates return 409. D1 migration 0010 adds three tables without modifying existing business records. `node tests/onboarding.test.mjs` exercises actual routes with isolated SQLite/mock storage, authorization, conflicts, snapshots and uploads.
