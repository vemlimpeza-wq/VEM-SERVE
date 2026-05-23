from tools.gmail_tools import send_quote_email
import os
from dotenv import load_dotenv

def test_html():
    load_dotenv()
    to_email = os.getenv("GMAIL_USER")
    print(f"Testando envio de e-mail rico em HTML para: {to_email}")
    send_quote_email(to_email, "Lavagem de Tapete Premium", "3.2", "2.0", "300,00", "João Silva")
    print("Sucesso! O e-mail HTML foi disparado.")

if __name__ == "__main__":
    test_html()
