import gspread
import os
import unicodedata

def normalize_header(header):
    if not header:
        return ""
    # Remove accents, lowercase, strip spaces and hyphens
    normalized = unicodedata.normalize('NFKD', header).encode('ASCII', 'ignore').decode('ASCII')
    return normalized.lower().replace("-", "").replace(" ", "").strip()

def get_google_sheet():
    cred_file = "credentials.json"
    if not os.path.exists(cred_file):
        cred_file = "credentials.json.json"
    
    gc = gspread.service_account(filename=cred_file)
    spreadsheets = gc.openall()
    if not spreadsheets:
        raise Exception("Nenhuma planilha encontrada para esta Conta de Servico.")
    return spreadsheets[0].get_worksheet(0)

def get_pending_quotes():
    worksheet = get_google_sheet()
    all_rows = worksheet.get_all_values()
    pending = []
    
    if len(all_rows) <= 1:
        return pending
        
    header_row = all_rows[0]
    header_map = {}
    for idx, col_name in enumerate(header_row):
        normalized = normalize_header(col_name)
        header_map[normalized] = idx
        
    # Get index for each field dynamically, with robust fallbacks
    idx_nome = header_map.get('nome', 6)
    idx_sobrenome = header_map.get('sobrenome', 7)
    idx_email = header_map.get('email', 8)
    
    # Try different naming options for 'valor'
    idx_valor = header_map.get('valordoorcamento', 11)
    if 'valordoorcamento' not in header_map:
        if 'valor' in header_map:
            idx_valor = header_map['valor']
            
    # Try different naming options for 'status'
    idx_status = header_map.get('statusdoenvio', 12)
    if 'statusdoenvio' not in header_map:
        if 'status' in header_map:
            idx_status = header_map['status']
            
    idx_servico = header_map.get('servico', 1)
    idx_comprimento = header_map.get('comprimento', 2)
    idx_largura = header_map.get('largura', 3)
    
    # New columns
    idx_lugares = header_map.get('lugaresdosofa', None)
    idx_colchao = header_map.get('tipodecolchao', None)
    
    # Indice 1-based no GSpread (1 é o cabecalho, 2 é a primeira linha de dados)
    for i, row in enumerate(all_rows[1:], start=2):
        nome = row[idx_nome].strip() if len(row) > idx_nome else ""
        sobrenome = row[idx_sobrenome].strip() if len(row) > idx_sobrenome else ""
        email = row[idx_email].strip() if len(row) > idx_email else ""
        valor = row[idx_valor].strip() if len(row) > idx_valor else ""
        status = row[idx_status].strip() if len(row) > idx_status else ""
        servico = row[idx_servico].strip() if len(row) > idx_servico else ""
        comprimento = row[idx_comprimento].strip() if len(row) > idx_comprimento else ""
        largura = row[idx_largura].strip() if len(row) > idx_largura else ""
        
        # New columns
        lugares_sofa = row[idx_lugares].strip() if idx_lugares is not None and len(row) > idx_lugares else ""
        tipo_colchao = row[idx_colchao].strip() if idx_colchao is not None and len(row) > idx_colchao else ""
        
        # Filtra: tem valor E o status está vazio ou é "Pendente"
        is_pending = not status or status.lower().strip() in ["pendente", ""]
        if valor and is_pending:
            pending.append({
                'row_index': i,
                'nome': nome,
                'sobrenome': sobrenome,
                'email': email,
                'valor': valor,
                'servico': servico,
                'comprimento': comprimento,
                'largura': largura,
                'lugares_sofa': lugares_sofa,
                'tipo_colchao': tipo_colchao
            })
            
    return pending

def update_status(row_index, status_val):
    worksheet = get_google_sheet()
    headers = worksheet.row_values(1)
    
    idx_status = 13 # default based on new schema (1-based index for 'Status do Envio')
    for idx, col_name in enumerate(headers, start=1):
        if normalize_header(col_name) in ['statusdoenvio', 'status']:
            idx_status = idx
            break
            
    worksheet.update_cell(row_index, idx_status, status_val)
