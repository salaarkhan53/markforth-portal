# Developer handover

## 1. What is included

All tracked repository files are exported byte-for-byte from the source commit recorded in `START_HERE.md`. This includes:

| Location | Purpose |
| --- | --- |
| `app/portal.tsx`, `app/globals.css` | Main CRM interface, reporting, lead review and bulk actions |
| `app/team-chat.tsx`, `app/chat-stickers.tsx` | Private group chat, replies, attachments and 60 stickers |
| `app/power-experience.tsx`, `lib/power.ts` | Podium, agent photographs, bonus challenges, sound and acknowledgements |
| `app/api/*` | Auth, lead/call/roster management, chat, protected files and bonus endpoints |
| `lib/portal-auth.ts` | Supabase password sessions, encrypted token storage, throttling and owner fallback |
| `db/schema.ts`, `drizzle/` | Cloudflare D1 schema and ten ordered SQL migrations (0000–0009) |
| `supabase/functions/markforth-auth-bridge/index.ts` | Auth account operations and SMTP welcome/reset credential emails |
| `public/brand/` | Original logo and emblem |
| `tests/` | Isolated API/security/performance workflow tests |
| `scripts/`, `vite.config.ts`, `worker/` | Vinext/Cloudflare/Sites build and local development integration |
| `package.json`, `pnpm-lock.yaml` | Dependency requirements and locked dependency graph |
| `.openai/hosting.json` | Existing Sites project identity and DB/BUCKET bindings |
| `handover/supabase-schema-reference.sql` | Current application-specific Supabase schema, constraints, RLS, restricted grants and Auth triggers; schema only |

The checked-in auth bridge was compared with the deployed Supabase version 6 and matches apart from surrounding whitespace. Gateway `verify_jwt` is enabled. The snapshot SQL is a reference for a fresh development project, not a migration to rerun against the existing database. Supabase-managed Auth internals are supplied by Supabase and are not exported here.

## 2. Current architecture

- React 19 + TypeScript on Vinext/Vite, deployed as a Cloudflare Worker through ChatGPT Sites.
- Sites project: `appgprj_6ae7e4d103ec8191a7187783e578fdd7`.
- Generated hosting URL: https://markforth-agent-portal.afaaqi932.chatgpt.site
- Custom domain: https://agents.markforthsol.com/
- Cloudflare D1 binding `DB`: leads, members, calls, chat, encrypted portal sessions, audit and bonus records.
- Cloudflare R2 binding `BUCKET`: private chat file uploads. Downloads are authenticated and checked against current group membership.
- Supabase project `himrllyhqktiljccafvl`: Auth accounts, the restricted authentication directory/configuration tables, Auth triggers and the `markforth-auth-bridge` function.
- Namecheap/cPanel: primary website, domain/DNS and Markforth mailbox. It does not host this portal's Worker, D1 or R2.
- Email uses two separately configured paths: the bridge mailbox settings for credential emails and Supabase Auth custom SMTP for confirmation/recovery links.

## 3. Access the owner must arrange separately

The ZIP provides code; it does not grant deployment or production data access.

1. An authenticated source-repository/editor workflow for the existing Sites project. Its Git endpoint is platform-authenticated, not a publicly cloneable GitHub repository. Ask the owner to arrange supported editor/repository access. Alternatively import this source snapshot into an owner-controlled repository for development; that alone does not connect it to the existing live deployment.
2. Supported hosting project access for publishing, runtime configuration and database/file backup operations. D1/R2 are provisioned by Sites; do not assume they exist in the developer's personal Cloudflare account or are directly manageable through their dashboard.
3. Supabase project access if changing Auth or the Edge Function. Use an individual collaborator account where available.
4. A portal admin test account, provisioned by the owner. Use a separate development environment and synthetic records for testing.
5. cPanel/DNS or mailbox access only if changing those services. The developer does not need the owner's personal ChatGPT password.

## 4. Local development

Use Node.js 24 LTS (the project declares >=22.13.0; tests use node:sqlite). Use the pinned pnpm 11.25.0 with the checked-in lockfile. WSL/Linux is the simplest environment for the included shell tooling. Check registry availability and package-manager engine requirements before setup; do not silently replace locked dependencies.

Typical standalone commands after extracting the ZIP:

```sh
pnpm install --frozen-lockfile
pnpm exec tsc --noEmit
node tests/portal.test.mjs
node tests/auth.test.mjs
node tests/auth-edge.test.mjs
node tests/chat.test.mjs
pnpm run build
pnpm run dev
```

The portable execution profile is selected when checkout-local `.sites-runtime/execution-profile.json` is absent. Runtime caches, dependencies and tool state are intentionally not shipped. `pnpm run install:ci` uses environment-specific Linux helpers; a normal pnpm install is more suitable for an independent checkout. `pnpm run dev` uses port 5173 in the portable profile. Confirm the startup log's actual address.

The Vite configuration creates local simulated D1/R2 bindings. To build schema in a NEW disposable local database, build once, then apply each file `drizzle/0000_*.sql` through `drizzle/0009_*.sql` in filename order with the bundled Wrangler:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_nifty_young_avengers.sql
```

Repeat with the next unapplied filename. This example shows only the first file. Never rerun migrations on an existing database without checking its applied history. The SQL contains schema and some initial directory/default-room seed data, not production customer records.

Copy `.dev.vars.example` to an ignored local `.dev.vars` and populate development-only values through the runtime configuration path. Cloudflare's dev runtime reads Worker variables; merely creating a generic `.env` file is not a production configuration step. Use HTTPS for complete password-session testing because the application cookie is `Secure` with the `__Host-` prefix. The UI, isolated tests and local database setup can be reviewed without production credentials.

The portable Sites starter can simulate a ChatGPT identity locally, but that identity does not automatically confer Markforth admin access. Do not remove authorization checks to make a dev login work. Provision an explicitly authorized synthetic development owner/admin and the corresponding development Supabase configuration. Production owner bootstrap depends on the Sites authenticated owner flow and the private one-time setup-token hash; it is not recreated by extracting the ZIP.

## 5. Runtime settings

| Setting | Location / purpose |
| --- | --- |
| `SUPABASE_URL` | Worker runtime; target Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Worker runtime; project publishable/compatible anon API key, never service-role key |
| `PORTAL_SESSION_KEY` | Worker secret; encryption of tokens in D1. Existing ciphertext depends on the current key |
| `PORTAL_OWNER_EMAIL` | Worker runtime; exact authorized owner account |
| `PORTAL_OWNER_SETUP_TOKEN` | Worker secret; controlled initial owner-registration flow only; matching hash lives in restricted Supabase config |
| `DB`, `BUCKET` | Worker resource bindings, not ordinary environment strings |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Edge Function server secret, never frontend or source |
| `RESEND_API_KEY`, `EMAIL_FROM` | Optional legacy email fallback, not needed when using the configured bridge mailbox |

No values for these secrets are included. Do not rotate `PORTAL_SESSION_KEY` casually: existing encrypted sessions will become unreadable. The bridge's encrypted SMTP settings depend on the Supabase service-role secret; a key/project change requires re-saving mailbox credentials. Owner account identifiers and public project/domain identifiers remain in the original source because behavior currently depends on them; coordinate changes with the owner.

Supabase Auth Site URL should remain https://agents.markforthsol.com, with https://agents.markforthsol.com/reset-password allowed for recovery. A development environment requires its own approved URLs. Configure SMTP using the current cPanel Secure SSL/TLS details and the full mailbox username. DNS alone does not configure sending.

## 6. Deployment and migration boundaries

For maintenance of the current portal, use the existing Sites source/version/deployment flow, preserve `.openai/hosting.json` project identity, and test before publishing. This ZIP does not contain the short-lived Git credentials or an authenticated publishing session. Dependency installation, build, source push and saved-version publication are separate operations in that workflow.

For a separate hosting provider, adapt the platform-owned identity routes, request/identity headers, build integration and resource provisioning. Do not deploy the placeholder D1 database ID in `vite.config.ts` as a real production database. Create real D1/R2 bindings and securely configure runtime secrets in the target environment. The portal cannot run as static files in cPanel public_html; a PHP/MySQL rewrite or another compatible server adaptation would be a separate project.

A new Supabase project also needs its restricted table/configuration setup, Auth triggers, preserved role grants, verified-JWT bridge deployment, SMTP and an authorized owner bootstrap. The included `supabase/config.example.toml` is only a function-settings fragment, not a complete Supabase configuration. No function or database deployment is performed by this handover.

## 7. Protect the existing production data

Before a production migration, arrange separate owner-authorized backups of:

- D1 business records and metadata, including retained historical/archived records.
- R2 objects and their matching D1 attachment metadata (object keys alone are not file contents).
- Supabase Auth identities and app directory/configuration, via supported backup/migration methods. Passwords cannot be obtained in plaintext, and user access needs a planned migration.
- Required runtime secrets through a secure account-access process, not WhatsApp or Git commits.
- Auth URLs, mailbox settings, domain DNS and applied migration history.

Production records, account lists, session tokens, setup-token hashes, SMTP ciphertext, secret values and uploaded customer/agent files are deliberately excluded. This ZIP is not sufficient on its own to move live users and data to a new host. Keep the existing deployment running until the migration and recovery paths are verified.

## 8. Current features and regression checks

- Admin-managed agent accounts, archive/restore/permanent deletion; individual logins, forced first password change and password reset.
- Lead submit/edit/delete/restore; DID and campaign tracking; CSV historical imports.
- Bulk review of up to 100 selected leads as Sale (CPA/CPL), Rejected or Pending, with shared rejection reason, audit/reviewer metadata and bonus recalculation.
- Manual call totals, call-to-transfer %, transfer-to-sale %, LPD and branded leaderboard/podium/photos.
- Power-hour announcements/bonus awards and persistent acknowledgement with browser-unlocked sound.
- Updates auto-membership, private groups with admin/moderator membership control, mentions, reactions, replies, private attachments and stickers.

Use the included test suites and add tests relevant to each code change. Check anonymous/disabled-user rejection, agent isolation, admin-only writes, private group/file access and bonus reversal. Test the UI on desktop/mobile, password email flows with a controlled recipient, and backup/restore before a production migration.

## 9. Export validation

This handover was validated as an export: tracked-file checksums match the published commit, the deployed auth bridge was compared, D1 migrations were applied in an empty in-memory SQLite database, and ZIP integrity was checked. Dependencies were not installed and the app was not rebuilt during export; prior build/test results do not replace the developer's own environment checks. `FILE_MANIFEST.json` lists exported file hashes; `handover/EXPORT_INFO.json` records provenance and exclusions.
