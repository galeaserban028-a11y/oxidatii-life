# Sync OXIDAȚII fixes → Lovable (20 Jul 2026)

Package: `C:\Users\xboxs\Downloads\Oxidatii-LOVABLE-SYNC.zip`

## CRITICAL — run SQL first

Before applying the zip in Lovable, run this SQL in Supabase project `qzxvnjpumtujfylfofmg` (SQL Editor):

- `docs/APPLY_GET_OR_CREATE_DM.sql` (also copied to `C:\Users\xboxs\Downloads\APPLY_GET_OR_CREATE_DM.sql`)
- Or apply migration `supabase/migrations/20260720130000_get_or_create_dm.sql`

Without `get_or_create_dm`, DM / inbox chat creation will fail even after the front-end sync.

## Prompt for Lovable Chat

```
CRITICAL: Run this SQL first in Supabase project qzxvnjpumtujfylfofmg, then apply the zip.
Do NOT redesign. Replace files from zip byte-for-byte:
src/router.tsx (hash history on Capacitor — fixes chat Not Found)
src/lib/chat.ts
src/lib/native.ts
src/routes/app.chat.$id.tsx
src/routes/app.inbox.tsx
src/routes/app.squad.tsx
src/routes/__root.tsx
src/integrations/supabase/types.ts
supabase/migrations/20260720130000_get_or_create_dm.sql
docs/APPLY_GET_OR_CREATE_DM.sql
List paths replaced. Publish.
```

## What this package fixes

1) **Chat Not Found on Capacitor** — `src/router.tsx` uses hash history on native so deep links like `/app/chat/:id` resolve correctly (browser history broke chat routes in the WebView).
2) **DM get-or-create** — `get_or_create_dm` RPC + typed client helpers in `src/lib/chat.ts`, inbox/squad entry points, and Supabase types.
3) Native helpers / root route wiring as needed for chat navigation.

## Files in this zip (replace byte-for-byte)

- src/router.tsx
- src/lib/chat.ts
- src/lib/native.ts
- src/routes/app.chat.$id.tsx
- src/routes/app.inbox.tsx
- src/routes/app.squad.tsx
- src/routes/__root.tsx
- src/integrations/supabase/types.ts
- supabase/migrations/20260720130000_get_or_create_dm.sql
- docs/APPLY_GET_OR_CREATE_DM.sql
- docs/LOVABLE_SYNC.md

## Install test build

`C:\Users\xboxs\Downloads\Oxidatii-INSTALL.zip` — uninstall old app first, then install.