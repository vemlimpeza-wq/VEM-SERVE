# POP: Gatilho de Automação (Watcher)

## Objetivo
Ativar o robô de forma automática (Fase 5 - Gatilho) sem intervenção humana, garantindo que qualquer novo orçamento preenchido no Google Sheets seja processado imediatamente.

## Estratégia de Disparo: Polling
Como o sistema roda de forma local/servidor independente (Python) e o Google Sheets não possui webhooks nativos simples para ambientes locais sem IP público, a estratégia mais robusta e determinística é o **Polling Contínuo**.

## Lógica Esperada (`watcher.py`)
1. O script entra em um loop infinito (`while True`).
2. A cada X minutos (padrão: 1 minuto), ele aciona a função `main()` do orquestrador.
3. Como o `main()` já filtra e pega APENAS quem tem o 'Valor' mas NÃO TEM o 'Status do Envio', ele ignorará todos os orçamentos antigos.
4. Se encontrar alguém novo, faz o processo e marca como ENVIADO.
5. Dorme (`time.sleep`) por mais 1 minuto.

## Vantagens
- Autorregenerativo: Se a internet cair, o `main()` vai falhar silenciosamente, e daqui a 1 minuto ele tenta de novo. O orçamento não é perdido.
- Seguro: Como a marcação de 'ENVIADO' é instantânea após o envio, o loop contínuo garante que não haverá duplicidade.
