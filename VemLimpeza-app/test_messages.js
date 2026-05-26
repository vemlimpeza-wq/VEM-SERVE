import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xhlsqestbhvdlpsrdjdk.supabase.co';
const supabaseKey = 'sb_publishable_O7trOvtZ25cp_4zRHFJChQ_yEAUCoTa';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  const { data, error } = await supabase.from('whatsapp_mensagens').select('*').limit(1);
  console.log(data, error);
}

testConnection();
