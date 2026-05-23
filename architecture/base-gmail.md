# POP: Disparo de E-mails via Gmail (base-gmail)

## Objetivo
Conectar-se aos servidores SMTP do Gmail para enviar os orçamentos de forma automatizada para os clientes.

## Entradas
- **Credenciais**: `GMAIL_USER` e `GMAIL_APP_PASSWORD` definidos no arquivo `.env`.
- **Destinatário**: O e-mail do cliente (vindo do Google Sheets).
- **Conteúdo**: Assunto e corpo do e-mail.

## Lógica Esperada da Ferramenta
1. Carregar variáveis do `.env`.
2. Conectar ao `smtp.gmail.com` usando SSL (porta 465).
3. Autenticar com o e-mail e a senha de aplicativo (removendo espaços se necessário).
4. Construir o objeto `EmailMessage` com Assunto, Remetente, Destinatário e Corpo.
5. Disparar a mensagem.

## Casos de Borda e Validações
- **Falha de Autenticação**: A senha de aplicativo pode estar incorreta ou revogada. O erro deve ser explícito para o usuário corrigir o `.env`.
- **E-mails Inválidos**: Validar formato do e-mail do destinatário antes de tentar enviar, prevenindo crashs de biblioteca.
- **Bloqueio de Rate Limit**: Enviar e-mails aos poucos, se forem muitos de uma vez, para não cair no filtro anti-spam do Google.
