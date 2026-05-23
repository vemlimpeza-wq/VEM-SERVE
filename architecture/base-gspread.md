# POP: Acesso Base ao Google Sheets (base-gspread)

## Objetivo
Estabelecer a conexão com a API do Google Sheets para ler e atualizar a planilha "Fonte da Verdade", que contém os orçamentos solicitados.

## Entradas
- **Credenciais**: Arquivo JSON da Conta de Serviço do Google Cloud (`credentials.json`).
- **ID da Planilha**: O código na URL da sua planilha do Google Sheets.
- **Nome da Aba**: A aba onde os dados estão inseridos (ex: "Página1").

## Lógica Esperada da Ferramenta
A ferramenta correspondente (a ser criada em `tools/`) deve ter funções atômicas e determinísticas para:
1. **Autenticar**: Usar a conta de serviço para acessar o Google Sheets via API (usando a biblioteca `gspread`).
2. **Ler Registros**: Baixar todos os dados da planilha e convertê-los em um formato processável (Lista de Dicionários).
3. **Filtrar Pendentes**: Identificar quais linhas têm a coluna `Status do Envio` vazia ou como "Pendente" para que possamos processar apenas esses.
4. **Atualizar Status**: Receber o número da linha processada e atualizar a coluna `Status do Envio` para "Enviado" (ou "Erro") para evitar envios duplicados.

## Casos de Borda e Validações
- **Planilha Inacessível**: O script deve falhar com um erro claro se a Conta de Serviço não tiver permissão na planilha.
- **Estrutura Incorreta**: O sistema deve checar se as colunas obrigatórias ("Data", "Email", "Status do Envio") existem antes de tentar ler dados.
- **Limites da API (Rate Limit)**: Adicionar pausas (`sleep`) caso haja muitas atualizações seguidas para evitar bloqueios do Google (HTTP 429).
