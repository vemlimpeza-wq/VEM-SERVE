import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const WHATSAPP_API_TOKEN = Deno.env.get("WHATSAPP_API_TOKEN")
const WHATSAPP_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_ID")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { telefone, mensagem, orcamento_id } = await req.json()

    if (!telefone || !mensagem) {
      return new Response(JSON.stringify({ error: "Telefone e mensagem são obrigatórios" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    if (!WHATSAPP_API_TOKEN || !WHATSAPP_PHONE_ID) {
      throw new Error("Configuração do WhatsApp ausente no servidor")
    }

    // Call Meta WhatsApp API
    const response = await fetch(`https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_ID}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHATSAPP_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: telefone,
        type: "text",
        text: {
          preview_url: false,
          body: mensagem
        }
      })
    })

    const result = await response.json()

    if (!response.ok) {
      console.error("Erro da Meta:", result)
      throw new Error(result.error?.message || "Erro ao enviar WhatsApp")
    }

    // Guardar o histórico no Supabase
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      
      const payload: any = {
        telefone_cliente: telefone,
        mensagem: mensagem,
        direcao: 'saida'
      }

      if (orcamento_id) {
        payload.orcamento_id = orcamento_id
      }

      const { error } = await supabase
        .from('whatsapp_mensagens')
        .insert([payload])

      if (error) {
        console.error("Erro ao gravar histórico no Supabase:", error)
      }
    }

    return new Response(JSON.stringify({ success: true, metaResponse: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error(error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
