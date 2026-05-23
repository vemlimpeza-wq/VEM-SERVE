# Constituição do Projeto

## Esquemas de dados (Schemas)

**Entrada (Fonte da Verdade - Google Sheets):**
- `Data`: String/Data
- `Serviço`: String
- `Comprimento`: Number
- `Largura`: Number
- `Nome`: String
- `Sobrenome`: String
- `Email`: String
- `WhatsApp`: String
- `Foto URL`: URL/String
- `Valor do Orçamento`: Number/String
- `Status do Envio`: String (ex: vazio, "ENVIADO", "ERRO")

**Saída (Payload):**
- E-mail enviado para o endereço do cliente com os dados do orçamento e saudação personalizada.
- Célula de `Status do Envio` atualizada na linha correspondente no Google Sheets.

## Regras comportamentais
- O sistema prioriza a confiabilidade sobre a velocidade.
- Nunca adivinhar a lógica de negócios.
- A lógica de negócios nas ferramentas deve ser determinística.

## Invariantes arquiteturais
- Arquitetura de 3 camadas A.N.T (Architecture, Navigation, Tools).
- Lógica de roteamento separa POPs e Ferramentas.
- Uso restrito de `.tmp/` para operações intermediárias.
