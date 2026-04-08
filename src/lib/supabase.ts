import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// This is the single client instance that can be imported to be used as needed.
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
