import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://chupsepeewkwfhokjayc.supabase.co";

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNodXBzZXBlZXdrd2Zob2tqYXljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MDI5MzksImV4cCI6MjA5NzI3ODkzOX0.Np78ZX1XaWjEu9PTCEY-mbQCLAqhADGfP9p_RySyv4k";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
