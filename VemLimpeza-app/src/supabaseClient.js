import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xhlsqestbhvdlpsrdjdk.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_O7trOvtZ25cp_4zRHFJChQ_yEAUCoTa';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
