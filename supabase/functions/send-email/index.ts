import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Trata requisições OPTIONS (CORS pré-flight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const brevoApiKey = Deno.env.get('BREVO_API_KEY') ?? '';

    if (!brevoApiKey) {
      throw new Error('Chave da API do Brevo não configurada no Supabase Secrets.');
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } },
    });

    // Pega o ID do orçamento e o valor do corpo da requisição
    const { quoteId, valor } = await req.json();

    if (!quoteId || !valor) {
      throw new Error('Parâmetros "quoteId" ou "valor" ausentes.');
    }

    // 1. Busca os dados completos do Orçamento
    const { data: quote, error: fetchError } = await supabase
      .from('orcamentos')
      .select('*')
      .eq('id', quoteId)
      .single();

    if (fetchError || !quote) {
      throw new Error(`Falha ao buscar orçamento: ${fetchError?.message}`);
    }

    const { servico, comprimento, largura, lugares_sofa, tipo_colchao, nome, sobrenome, email } = quote;
    const nomeCompleto = `${nome} ${sobrenome}`.trim();
    const saudacao = nome ? `Olá, ${nome}!` : "Olá!";

    // Lógica para descrições de medidas
    let specs = [];
    if (lugares_sofa) specs.push(lugares_sofa);
    if (tipo_colchao) specs.push(tipo_colchao);
    if (comprimento && largura) specs.push(`medidas de ${comprimento} x ${largura}`);
    const specsStr = specs.length > 0 ? ` (${specs.join(', ')})` : "";

    // 2. Constrói o HTML do E-mail (O mesmo design original em Python)
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&family=Inter:wght@400;600&display=swap" rel="stylesheet">
        <style>
            body { margin: 0; padding: 0; font-family: 'Inter', sans-serif; background-color: #e9e9e9; }
            .wrapper { max-width: 600px; margin: 0 auto; background-color: #5C32F0; overflow: hidden; }
            .top-bar { padding: 20px 30px; display: flex; justify-content: space-between; align-items: center; color: white; font-family: 'Fredoka', sans-serif; border-bottom: 2px dashed rgba(255,255,255,0.2); margin-bottom: 20px; }
            .top-bar-title { font-size: 26px; font-weight: 700; letter-spacing: -0.5px; }
            .hero { padding: 10px 40px 30px 40px; text-align: left; }
            .hero h1 { color: #ffffff; font-family: 'Fredoka', sans-serif; font-size: 42px; line-height: 1.1; margin: 0 0 25px 0; letter-spacing: 0.5px; }
            .main-image { width: 100%; border-radius: 12px; margin-bottom: 25px; object-fit: cover; border: 4px solid #ffffff; height: auto; }
            .details { color: #ffffff; font-size: 16px; line-height: 1.5; text-align: center; margin-bottom: 30px; }
            .details strong { font-weight: 600; color: #FFD166; }
            .cta-container { text-align: center; margin-bottom: 20px; }
            .cta-button { display: inline-block; background-color: #ffffff; color: #5C32F0; text-decoration: none; padding: 18px 40px; font-family: 'Fredoka', sans-serif; font-size: 22px; border-radius: 8px; font-weight: bold; box-shadow: 0 4px 0 rgba(0,0,0,0.1); }
            .wave-divider { width: 100%; height: auto; display: block; margin-bottom: -1px; }
            .bottom-section { background-color: #FFF5F8; padding: 40px; text-align: center; color: #1a1a1a; }
            .bottom-section h2 { font-family: 'Fredoka', sans-serif; font-size: 32px; margin: 0 0 15px 0; letter-spacing: -0.5px; }
            .bottom-section p { font-size: 16px; margin-bottom: 30px; color: #444; line-height: 1.5; }
            .whatsapp-btn { display: inline-block; background-color: #25D366; color: #ffffff; text-decoration: none; padding: 16px 35px; border-radius: 50px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 15px rgba(37, 211, 102, 0.4); }
        </style>
    </head>
    <body>
        <div class="wrapper">
            <div class="top-bar"><span class="top-bar-title">VEM Limpeza</span></div>
            <div class="hero">
                <h1>O seu orçamento<br>está pronto!</h1>
                <img class="main-image" src="https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&q=80&w=800" alt="Limpeza Profissional">
                <div class="details">
                    ${saudacao}<br><br>
                    Analisamos os detalhes para a <strong>${servico}</strong>${specsStr} e preparamos uma cotação exclusiva para deixar tudo brilhando.
                </div>
                <div class="cta-container">
                    <div class="cta-button">Valor: Kz ${valor}</div>
                </div>
            </div>
            <svg class="wave-divider" viewBox="0 0 1440 120" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><path d="M0,64L48,69.3C96,75,192,85,288,80C384,75,480,53,576,48C672,43,768,53,864,64C960,75,1056,85,1152,80C1248,75,1344,53,1392,42.7L1440,32L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z" fill="#FFF5F8"></path></svg>
            <div class="bottom-section">
                <h2>Vamos agendar?</h2>
                <p>Cada detalhe conta para uma limpeza perfeita. Se o valor estiver de acordo, clique abaixo para falar diretamente com a nossa equipa no WhatsApp e agendar o serviço.</p>
                <a href="https://wa.me/244927558203" class="whatsapp-btn">Falar no WhatsApp</a>
            </div>
        </div>
    </body>
    </html>`;

    // 3. Dispara a requisição para a API do Brevo
    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": brevoApiKey,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        sender: {
          name: "VEM Limpeza",
          email: "marcos.casimiro@vemlimpeza.com"
        },
        to: [{
          email: email,
          name: nomeCompleto
        }],
        subject: `O seu orçamento para ${servico} está pronto!`,
        htmlContent: htmlContent
      })
    });

    if (!brevoResponse.ok) {
      const errorText = await brevoResponse.text();
      throw new Error(`Erro na API do Brevo: ${brevoResponse.status} - ${errorText}`);
    }

    // 4. Atualiza o status e o valor na tabela orcamentos no Supabase
    // Usa uma service_role key em vez da auth do request para poder atualizar status com bypass RLS, ou apenas anon se a policy permitir
    // Usaremos a requisição original pois a policy permite UPDATE anônimo
    const { error: updateError } = await supabase
      .from('orcamentos')
      .update({ 
        valor_orcamento: valor, 
        status_envio: 'Enviado' 
      })
      .eq('id', quoteId);

    if (updateError) {
      console.warn("E-mail enviado, mas falha ao atualizar status no banco:", updateError.message);
    }

    return new Response(
      JSON.stringify({ success: true, message: "E-mail enviado com sucesso" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erro na Edge Function:", error);
    
    // Tenta atualizar o status para Erro, ignorando erros adicionais
    try {
      // Nota: precisaríamos do supabase instance e quoteId para atualizar, mas pode já ter falhado antes
    } catch (e) {}

    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
