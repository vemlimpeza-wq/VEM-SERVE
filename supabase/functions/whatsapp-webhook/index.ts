import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const WHATSAPP_VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN") || "vemlimpeza_token"
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

serve(async (req) => {
  const url = new URL(req.url)

  // Webhook Verification (GET)
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode")
    const token = url.searchParams.get("hub.verify_token")
    const challenge = url.searchParams.get("hub.challenge")

    if (mode === "subscribe" && token === WHATSAPP_VERIFY_TOKEN) {
      console.log("Webhook verified!")
      return new Response(challenge, { status: 200 })
    } else {
      return new Response("Forbidden", { status: 403 })
    }
  }

  // Handle incoming messages (POST)
  if (req.method === "POST") {
    try {
      const body = await req.json()

      // Validação básica do payload do WhatsApp
      if (body.object === "whatsapp_business_account") {
        for (const entry of body.entry) {
          for (const change of entry.changes) {
            if (change.value && change.value.messages) {
              for (const message of change.value.messages) {
                // Se a mensagem for de texto
                if (message.type === "text") {
                  const fromPhone = message.from
                  const messageText = message.text.body
                  
                  console.log(`Mensagem recebida de ${fromPhone}: ${messageText}`)

                  // Guardar na base de dados (Supabase)
                  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
                    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

                    const { error } = await supabase
                      .from('whatsapp_mensagens')
                      .insert([
                        {
                          telefone_cliente: fromPhone,
                          mensagem: messageText,
                          direcao: 'entrada'
                        }
                      ])
                    
                    if (error) {
                      console.error("Erro ao gravar no Supabase:", error)
                    }
                  }
                }
              }
            }
          }
        }
      }

      return new Response("EVENT_RECEIVED", { status: 200 })
    } catch (e) {
      console.error(e)
      return new Response("Error", { status: 500 })
    }
  }

  return new Response("Method not allowed", { status: 405 })
})
