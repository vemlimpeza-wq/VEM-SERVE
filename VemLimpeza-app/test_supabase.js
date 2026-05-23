import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xhlsqestbhvdlpsrdjdk.supabase.co';
const supabaseKey = 'sb_publishable_O7trOvtZ25cp_4zRHFJChQ_yEAUCoTa';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('Testing Supabase JS connection...');
  try {
    const { data, error } = await supabase.from('_dummy_table_test_').select('*').limit(1);
    if (error) {
      if (error.code === '42P01') {
        console.log('✅ Conexão Frontend (JS) Bem Sucedida! (A API do Supabase respondeu corretamente).');
      } else {
        console.log('⚠️ A API respondeu, mas com um erro inesperado:', error);
      }
    } else {
      console.log('✅ Conexão Frontend (JS) Bem Sucedida! Dados:', data);
    }
  } catch (e) {
    console.log('❌ Falha na conexão:', e.message);
  }
}

testConnection();
