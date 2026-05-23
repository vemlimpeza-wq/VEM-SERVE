# POP: Orquestrador Principal do Disparador

## Objetivo
Atuar como o cérebro da automação (Camada 2 - Navegação). Ler a planilha do Google Sheets, filtrar orçamentos pendentes com valor definido, enviar e-mails via Gmail e atualizar a coluna "Status do Envio".

## Ferramentas (Camada 3) Relacionadas
- `tools/gspread_tools.py`: Acesso ao Google Sheets.
- `tools/gmail_tools.py`: Disparo via Gmail.

## Lógica Esperada (Navegação)
1. Chamar `get_pending_quotes()` do gspread_tools.
2. Iterar sobre a lista recebida.
3. Se não houver e-mail válido preenchido, pular o envio e escrever `ERRO`.
4. Tentar chamar `send_quote_email()` do gmail_tools.
5. Se for bem-sucedido, chamar `update_status(row_index, "ENVIADO")`.
6. Se falhar (e-mail inválido ou problema de servidor), chamar `update_status(row_index, "ERRO")`.

## Tratamento de Falhas (Autorregeneração)
O script orquestrador deve possuir blocos `try/except` robustos. A falha no envio para um cliente NÃO PODE parar a execução do próximo cliente da lista. A atualização para a string `ERRO` na planilha sinaliza que houve falha humana no input do e-mail ou falha temporária.
