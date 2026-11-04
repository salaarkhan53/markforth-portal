# Markforth Agent Portal — developer handover

This ZIP contains the full tracked application source from published version 13, including the separate Supabase authentication Edge Function. Open `handover/DEVELOPER_HANDOVER.md` first.

- Live portal: https://agents.markforthsol.com/
- Source commit: `e7eb97481917a72d5cd87919d6fc6ab1adc00632`
- Source lives under this folder, not in cPanel public_html.
- Includes application code, UI components, original brand assets, package lockfile, D1 schema/migrations, tests and build scripts.
- Includes a schema-only snapshot of the app-specific Supabase tables and Auth triggers. No live records or secret values are included.
- This is a source-code handover, not a complete production backup or a cPanel upload package.
- No live deployment was changed to produce this ZIP.

The existing `README.md` is preserved verbatim and contains starter documentation and historical setup notes. Use the handover guide for the current architecture and access boundaries.
