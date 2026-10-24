import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
// Support modern publishable key (sb_publishable_...) with backward-compatible anon key fallback
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

export const isSupabaseConfigured = Boolean(
  supabaseUrl.trim() &&
    supabasePublishableKey.trim() &&
    !supabaseUrl.includes("placeholder")
);

export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : createClient(
      "https://placeholder-project.supabase.co",
      "placeholder-anon-key-safe-for-local-development",
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
