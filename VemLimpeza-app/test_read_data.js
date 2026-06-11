import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xhlsqestbhvdlpsrdjdk.supabase.co';
const supabaseKey = 'sb_publishable_O7trOvtZ25cp_4zRHFJChQ_yEAUCoTa';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testRead() {
  console.log('Buscando dados da tabela orcamentos no Supabase...');
  try {
    const { data: orcamentos, error: err1 } = await supabase
      .from('orcamentos')
      .select('*')
      .limit(5);

    if (err1) {
      console.error('Erro ao ler orcamentos:', err1);
    } else {
      console.log(`✅ Sucesso! Encontrados ${orcamentos.length} orçamentos na amostra.`);
      if (orcamentos.length > 0) {
        console.log('Amostra de orçamento:', {
          id: orcamentos[0].id,
          nome: orcamentos[0].nome,
          servico: orcamentos[0].servico,
          whatsapp: orcamentos[0].whatsapp,
          criado_em: orcamentos[0].criado_em
        });
      }
    }

    console.log('Buscando dados da tabela whatsapp_mensagens no Supabase...');
    const { data: mensagens, error: err2 } = await supabase
      .from('whatsapp_mensagens')
      .select('count')
      .limit(1);
      
    if (err2) {
      console.error('Erro ao ler whatsapp_mensagens:', err2);
    } else {
      console.log(`✅ Sucesso ao ler tabela de mensagens!`);
    }
  } catch (e) {
    console.error('Falha de execução:', e.message);
  }
}

testRead();
