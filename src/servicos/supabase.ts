import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl: string = import.meta.env.VITE_SUPABASE_URL ?? ''
const supabasePublishableKey: string = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ''

if (!supabaseUrl || !supabasePublishableKey) {
  console.warn(
    '[supabase] VITE_SUPABASE_URL ou VITE_SUPABASE_PUBLISHABLE_KEY não definidas. O cliente não será inicializado.',
  )
}

export const supabaseClient: SupabaseClient = createClient(supabaseUrl, supabasePublishableKey)
