import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xhlsqestbhvdlpsrdjdk.supabase.co';
const supabaseKey = 'sb_publishable_O7trOvtZ25cp_4zRHFJChQ_yEAUCoTa';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  // Deletar mensagens de saida para permitir o bot disparar no teste
  const { error } = await supabase
    .from('whatsapp_mensagens')
    .delete()
    .eq('telefone_cliente', '244927558203')
    .eq('direcao', 'saida');
    
  if (error) {
    console.error("Erro ao deletar:", error);
  } else {
    console.log("Histórico de 'saída' limpo com sucesso para testes!");
  }
}

testConnection();
