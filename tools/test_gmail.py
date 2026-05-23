import smtplib
from email.message import EmailMessage
import os
from dotenv import load_dotenv

def test_gmail():
    # Carregar variaveis do arquivo .env
    load_dotenv()
    
    sender_email = os.getenv("GMAIL_USER")
    app_password = os.getenv("GMAIL_APP_PASSWORD")
    
    if not sender_email or not app_password:
        print("Erro: Variaveis GMAIL_USER e/ou GMAIL_APP_PASSWORD não encontradas no arquivo .env")
        return
        
    print(f"Tentando conectar ao Gmail com a conta: {sender_email}")
    
    # Remove espacos da senha (o Google as vezes gera com espaços)
    app_password = app_password.replace(" ", "")
    
    # Criar mensagem
    msg = EmailMessage()
    msg.set_content("Este e um e-mail de teste disparado pelo nosso robo!\nSe voce recebeu isso, a conexao com o Gmail funcionou perfeitamente!")
    msg['Subject'] = "Teste de Conexao do Robo"
    msg['From'] = sender_email
    msg['To'] = sender_email # Vamos enviar para nos mesmos no teste
    
    try:
        # Conectar e enviar usando SMTP_SSL (porta 465)
        print("Conectando ao servidor smtp.gmail.com...")
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
            smtp.login(sender_email, app_password)
            smtp.send_message(msg)
        print("Sucesso! O e-mail de teste foi enviado para " + sender_email)
    except Exception as e:
        print(f"Erro ao enviar e-mail: {e}")

if __name__ == "__main__":
    test_gmail()
