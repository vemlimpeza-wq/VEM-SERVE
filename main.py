from tools.gspread_tools import get_pending_quotes, update_status
from tools.gmail_tools import send_quote_email
import time

def main():
    print("========================================")
    print("Iniciando o Robô Disparador de Orçamentos")
    print("========================================\n")
    
    print("1. Buscando orçamentos pendentes no Google Sheets...")
    try:
        pending = get_pending_quotes()
    except Exception as e:
        print(f"Erro ao acessar o Google Sheets: {e}")
        return
        
    if not pending:
        print("Nenhum orçamento pendente encontrado. Tudo em dia!")
        return
        
    print(f"Encontrados {len(pending)} orçamentos pendentes para disparo.\n")
    
    for quote in pending:
        email = quote['email']
        servico = quote['servico']
        valor = quote['valor']
        row_index = quote['row_index']
        comprimento = quote['comprimento']
        largura = quote['largura']
        nome = quote.get('nome', '')
        sobrenome = quote.get('sobrenome', '')
        nome_completo = f"{nome} {sobrenome}".strip()
        
        # New fields
        lugares_sofa = quote.get('lugares_sofa', '')
        tipo_colchao = quote.get('tipo_colchao', '')
        
        # Log basic info
        info_extra = []
        if lugares_sofa:
            info_extra.append(f"Lugares: {lugares_sofa}")
        if tipo_colchao:
            info_extra.append(f"Colchão: {tipo_colchao}")
        if comprimento and largura:
            info_extra.append(f"Medidas: {comprimento}x{largura}")
        extra_str = f" | {', '.join(info_extra)}" if info_extra else ""
        
        print(f"Processando Linha {row_index} | Cliente: '{nome_completo}' | E-mail: '{email}' | Serviço: {servico}{extra_str} | Valor: {valor}")
        
        # Validacao basica para nao tentar enviar para e-mail totalmente em branco
        if not email or "@" not in email:
            print(f"   E-mail inválido ('{email}'). Atualizando status para ERRO.")
            try:
                update_status(row_index, "ERRO")
            except Exception as e:
                print(f"      Falha ao escrever ERRO no sheets: {e}")
            continue
            
        try:
            print("   Enviando e-mail HTML personalizado...")
            send_quote_email(email, servico, comprimento, largura, valor, nome_completo, lugares_sofa, tipo_colchao)
            print("   E-mail enviado com sucesso. Atualizando status...")
            update_status(row_index, "ENVIADO")
            print("   Status atualizado para ENVIADO.")
        except Exception as e:
            print(f"   Falha no envio: {e}. Atualizando status para ERRO.")
            try:
                update_status(row_index, "ERRO")
            except Exception as inner_e:
                 print(f"      Falha ao escrever ERRO no sheets: {inner_e}")
                 
        # Pausa leve para não acionar bloqueio por spam/rate limit
        time.sleep(2)
            
    print("\nExecução concluída!")

if __name__ == "__main__":
    main()
