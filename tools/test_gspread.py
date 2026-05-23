import gspread
import os

def run_handshake():
    # Procurar o arquivo de credenciais
    cred_file = "credentials.json"
    if not os.path.exists(cred_file):
        cred_file = "credentials.json.json"
    
    if not os.path.exists(cred_file):
        print("Erro: Arquivo de credenciais não encontrado.")
        return

    try:
        print("Autenticando...")
        gc = gspread.service_account(filename=cred_file)
        
        # Obter todas as planilhas compartilhadas
        print("Buscando planilhas compartilhadas...")
        spreadsheets = gc.openall()
        if not spreadsheets:
            print("Erro: Nenhuma planilha foi compartilhada com a Conta de Serviço.")
            return
            
        # Pega a primeira planilha disponível
        sheet = spreadsheets[0]
        print(f"Conectado com sucesso à planilha: '{sheet.title}'\n")
        
        # Pega a primeira aba
        worksheet = sheet.get_worksheet(0)
        
        # Pega todas as linhas
        data = worksheet.get_all_values()
        
        if len(data) >= 1:
            print("Cabecalho:", data[0])
        if len(data) >= 2:
            print("Primeira Linha de Dados:", data[1])
        else:
            print("A planilha parece estar vazia além do cabeçalho.")
            
    except Exception as e:
        print(f"Erro ao conectar com o Google Sheets: {e}")

if __name__ == "__main__":
    run_handshake()
