import os
import json
import gspread
import unicodedata

def normalize_header(header):
    if not header:
        return ""
    normalized = unicodedata.normalize('NFKD', header).encode('ASCII', 'ignore').decode('ASCII')
    return normalized.lower().replace("-", "").replace(" ", "").strip()

def run_diagnostics():
    cred_file = "credentials.json"
    if not os.path.exists(cred_file):
        cred_file = "credentials.json.json"
        
    report = []
    report.append("# Relatório de Diagnóstico do Google Sheets\n")
    
    if not os.path.exists(cred_file):
        report.append(f"❌ **Erro:** Arquivo de credenciais (`{cred_file}`) não encontrado no diretório do projeto.")
        write_report(report)
        return
        
    try:
        with open(cred_file, 'r') as f:
            creds = json.load(f)
            client_email = creds.get("client_email")
            report.append(f"✅ **Credenciais carregadas:**\n- Projeto: `{creds.get('project_id')}`\n- E-mail da Conta de Serviço: `{client_email}`\n")
    except Exception as e:
        report.append(f"❌ **Erro ao ler arquivo de credenciais:** {e}")
        write_report(report)
        return

    try:
        report.append("🔌 **Conectando ao Google Sheets API...**")
        gc = gspread.service_account(filename=cred_file)
        report.append("✅ **Autenticação realizada com sucesso!**\n")
        
        report.append("📂 **Buscando planilhas compartilhadas...**")
        spreadsheets = gc.openall()
        
        if not spreadsheets:
            report.append(f"❌ **Nenhuma planilha encontrada compartilhada com a Conta de Serviço (`{client_email}`).**")
            report.append("\n> **Ação necessária:** Por favor, abra a sua planilha do Google Sheets, clique no botão 'Compartilhar' no canto superior direito e adicione o e-mail da conta de serviço acima como editor.")
            write_report(report)
            return
            
        report.append(f"✅ **Encontrada(s) {len(spreadsheets)} planilha(s):**\n")
        
        for idx, sheet in enumerate(spreadsheets):
            report.append(f"### Planilha {idx+1}: {sheet.title} (ID: `{sheet.id}`)")
            
            try:
                all_worksheets = sheet.worksheets()
                report.append(f"- **Abas encontradas ({len(all_worksheets)}):**")
                for w_idx, ws in enumerate(all_worksheets):
                    report.append(f"  - Aba {w_idx+1}: `{ws.title}`")
                
                # Vamos analisar cada aba!
                for w_idx, worksheet in enumerate(all_worksheets):
                    report.append(f"\n#### Análise da Aba `{worksheet.title}`:")
                    all_rows = worksheet.get_all_values()
                    if not all_rows:
                        report.append("  - ⚠️ Aba vazia.")
                        continue
                        
                    headers = all_rows[0]
                    report.append("  - **Cabeçalhos:**")
                    for col_idx, h in enumerate(headers):
                        norm = normalize_header(h)
                        report.append(f"    - Coluna {col_idx+1}: `{h}` (normalizada: `{norm}`)")
                        
                    total_rows = len(all_rows)
                    report.append(f"  - **Total de linhas:** {total_rows}")
                    
                    # Check mapping
                    header_map = {normalize_header(h): c_idx for c_idx, h in enumerate(headers)}
                    
                    # Check pending rows
                    idx_status = None
                    for status_name in ['statusdoenvio', 'status']:
                        if status_name in header_map:
                            idx_status = header_map[status_name]
                            break
                            
                    idx_valor = None
                    for valor_name in ['valordoorcamento', 'valor']:
                        if valor_name in header_map:
                            idx_valor = header_map[valor_name]
                            break
                            
                    if idx_status is not None and idx_valor is not None:
                        idx_nome = header_map.get('nome', 6)
                        idx_email = header_map.get('email', 8)
                        pending_count = 0
                        empty_status_count = 0
                        other_status_values = {}
                        
                        report.append("\n  **Linhas 'Pendente' ou Vazio nesta aba:**")
                        
                        for row_idx, row in enumerate(all_rows[1:], start=2):
                            status_val = row[idx_status].strip() if len(row) > idx_status else ""
                            valor_val = row[idx_valor].strip() if len(row) > idx_valor else ""
                            nome_val = row[idx_nome].strip() if len(row) > idx_nome else ""
                            email_val = row[idx_email].strip() if len(row) > idx_email else ""
                            
                            is_pending = not status_val or status_val.lower() in ["pendente", ""]
                            if is_pending:
                                report.append(f"  - Linha {row_idx}: Nome=`{nome_val}`, Email=`{email_val}`, Valor=`{valor_val}`, Status=`{status_val}`")
                                report.append(f"    - 📋 Linha Completa (tamanho={len(row)}): `{row}`")
                                if valor_val:
                                    pending_count += 1
                                else:
                                    report.append(f"    - ⚠️ Ignorada: Coluna 'Valor do Orçamento' (índice {idx_valor}) está vazia.")
                            
                            if not status_val:
                                empty_status_count += 1
                            else:
                                other_status_values[status_val] = other_status_values.get(status_val, 0) + 1
                                
                        report.append(f"\n  **Exemplo de 2 linhas com Status 'ENVIADO' nesta aba:**")
                        enviado_printed = 0
                        for row_idx, row in enumerate(all_rows[1:], start=2):
                            status_val = row[idx_status].strip() if len(row) > idx_status else ""
                            if status_val.lower() == "enviado":
                                report.append(f"  - Linha {row_idx}: `{row}`")
                                enviado_printed += 1
                                if enviado_printed >= 2:
                                    break
                                    
                        report.append(f"\n  **Resumo de Análise da Aba `{worksheet.title}`:**")
                        report.append(f"  - Linhas com status vazio ou 'Pendente' que têm valor: **{pending_count}**")
                        report.append(f"  - Linhas com status vazio: **{empty_status_count}**")
                        report.append(f"  - Outros valores encontrados na coluna Status: `{other_status_values}`")
                    else:
                        report.append("\n  ❌ Não foi possível analisar pendentes nesta aba (colunas de Status ou Valor não identificadas).")
                
            except Exception as sheet_e:
                report.append(f"- ❌ Erro ao ler dados desta planilha: {sheet_e}")
            report.append("\n---\n")
            
    except Exception as e:
        report.append(f"❌ **Erro na conexão com o Google Sheets:** {e}")
        
    write_report(report)
    print("\n[DIAGNÓSTICO] Relatório 'diagnose_report.md' gerado com sucesso!")
    print("[DIAGNÓSTICO] Por favor, verifique o arquivo gerado para ver os detalhes da conexão e das colunas.")

def write_report(lines):
    with open("diagnose_report.md", "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

if __name__ == "__main__":
    run_diagnostics()
