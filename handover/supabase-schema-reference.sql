-- SCHEMA-ONLY REFERENCE SNAPSHOT; not a migration history.

-- Review in a NEW development Supabase project only. Do NOT replay on production.

-- Excludes every account, token, setup hash, SMTP ciphertext and configuration row.

BEGIN;

CREATE TABLE "public"."markforth_auth_directory" (
  "email" text NOT NULL,
  "auth_user_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "role" text DEFAULT 'agent'::text NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "must_change_password" boolean DEFAULT false NOT NULL,
  CONSTRAINT "markforth_auth_directory_auth_user_id_fkey" FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT "markforth_auth_directory_auth_user_id_key" UNIQUE (auth_user_id),
  CONSTRAINT "markforth_auth_directory_pkey" PRIMARY KEY (email),
  CONSTRAINT "markforth_auth_directory_role_check" CHECK (role = ANY (ARRAY['admin'::text, 'agent'::text]))
);

ALTER TABLE "public"."markforth_auth_directory" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "public"."markforth_auth_directory" FROM PUBLIC, anon, authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON "public"."markforth_auth_directory" TO service_role;

CREATE TABLE "public"."markforth_bridge_config" (
  "id" text NOT NULL,
  "secret_hash" text NOT NULL,
  "smtp_cipher" text,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "owner_setup_hash" text,
  CONSTRAINT "markforth_bridge_config_id_check" CHECK (id = 'portal'::text),
  CONSTRAINT "markforth_bridge_config_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."markforth_bridge_config" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "public"."markforth_bridge_config" FROM PUBLIC, anon, authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON "public"."markforth_bridge_config" TO service_role;

CREATE OR REPLACE FUNCTION public.markforth_register_confirmed_owner()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ declare expected_hash text; supplied_hash text; begin if lower(new.email) = 'mrintellectual777@gmail.com' and new.email_confirmed_at is not null then select owner_setup_hash into expected_hash from public.markforth_bridge_config where id='portal'; supplied_hash:=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(coalesce(new.raw_user_meta_data->>'markforth_owner_registration',''),'UTF8')),'hex'); if expected_hash is not null and supplied_hash=expected_hash then insert into public.markforth_auth_directory(email,auth_user_id,role,active) values (lower(new.email),new.id,'admin',true) on conflict (email) do update set auth_user_id=excluded.auth_user_id,role='admin',active=true; update auth.users set raw_app_meta_data=coalesce(raw_app_meta_data,'{}'::jsonb)||'{"markforth_portal":true}'::jsonb,raw_user_meta_data=coalesce(raw_user_meta_data,'{}'::jsonb)-'markforth_owner_registration' where id=new.id; update public.markforth_bridge_config set owner_setup_hash=null where id='portal'; end if; end if; return new; end; $function$;

REVOKE ALL ON FUNCTION "public"."markforth_register_confirmed_owner"() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION "public"."markforth_register_confirmed_owner"() TO service_role;

CREATE OR REPLACE FUNCTION public.markforth_password_changed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ begin if old.encrypted_password is distinct from new.encrypted_password then update public.markforth_auth_directory set must_change_password=false where auth_user_id=new.id; end if; return new; end; $function$;

REVOKE ALL ON FUNCTION "public"."markforth_password_changed"() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION "public"."markforth_password_changed"() TO service_role;

CREATE TRIGGER markforth_confirmed_owner AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users FOR EACH ROW EXECUTE FUNCTION markforth_register_confirmed_owner();

CREATE TRIGGER markforth_password_changed AFTER UPDATE OF encrypted_password ON auth.users FOR EACH ROW EXECUTE FUNCTION markforth_password_changed();

-- Intentionally no INSERT for markforth_bridge_config or markforth_auth_directory.

-- New-project bootstrap needs an independently configured private owner setup token/hash.

-- Keep existing project settings for maintenance; do not create a second owner mapping.

COMMIT;
