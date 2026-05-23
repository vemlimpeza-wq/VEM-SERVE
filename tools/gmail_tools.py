import smtplib
from email.message import EmailMessage
import os
from dotenv import load_dotenv

def send_quote_email(to_email, servico, comprimento, largura, valor, nome="", lugares_sofa="", tipo_colchao=""):
    load_dotenv()
    sender_email = os.getenv("GMAIL_USER")
    app_password = os.getenv("GMAIL_APP_PASSWORD")
    
    if not sender_email or not app_password:
        raise Exception("Credenciais de e-mail ausentes no arquivo .env")
        
    app_password = app_password.replace(" ", "")
    
    msg = EmailMessage()
    msg['Subject'] = f"Orçamento Pronto: {servico}"
    msg['From'] = sender_email
    msg['To'] = to_email
    
    msg.set_content(f"Seu cliente de e-mail não suporta HTML. O valor do orçamento para {servico} é R$ {valor}.")
    
    saudacao = f"Olá, {nome}!" if nome else "Olá!"
    
    # Determina dinamicamente a descrição dos detalhes
    detalhes_specs = []
    if lugares_sofa:
        detalhes_specs.append(f"{lugares_sofa}")
    if tipo_colchao:
        detalhes_specs.append(f"{tipo_colchao}")
    if comprimento and largura:
        try:
            if float(comprimento) > 0 and float(largura) > 0:
                detalhes_specs.append(f"medidas de {comprimento}m x {largura}m")
        except ValueError:
            if comprimento.strip() and largura.strip():
                detalhes_specs.append(f"medidas de {comprimento} x {largura}")
                
    specs_str = f" ({', '.join(detalhes_specs)})" if detalhes_specs else ""
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&family=Inter:wght@400;600&display=swap" rel="stylesheet">
        <style>
            body {{ margin: 0; padding: 0; font-family: 'Inter', sans-serif; background-color: #e9e9e9; }}
            .wrapper {{ max-width: 600px; margin: 0 auto; background-color: #5C32F0; overflow: hidden; }}
            .top-bar {{ padding: 20px 30px; display: flex; justify-content: space-between; align-items: center; color: white; font-family: 'Fredoka', sans-serif; border-bottom: 2px dashed rgba(255,255,255,0.2); margin-bottom: 20px; }}
            .top-bar-title {{ font-size: 26px; font-weight: 700; letter-spacing: -0.5px; }}
            .top-bar-link {{ font-size: 12px; font-family: 'Inter', sans-serif; color: rgba(255,255,255,0.8); text-decoration: none; }}
            
            .hero {{ padding: 10px 40px 30px 40px; text-align: left; }}
            .hero h1 {{ color: #ffffff; font-family: 'Fredoka', sans-serif; font-size: 42px; line-height: 1.1; margin: 0 0 25px 0; letter-spacing: 0.5px; }}
            
            .main-image {{ width: 100%; border-radius: 12px; margin-bottom: 25px; object-fit: cover; border: 4px solid #ffffff; height: auto; }}
            
            .details {{ color: #ffffff; font-size: 16px; line-height: 1.5; text-align: center; margin-bottom: 30px; }}
            .details strong {{ font-weight: 600; color: #FFD166; }}
            
            .cta-container {{ text-align: center; margin-bottom: 20px; }}
            .cta-button {{ display: inline-block; background-color: #ffffff; color: #5C32F0; text-decoration: none; padding: 18px 40px; font-family: 'Fredoka', sans-serif; font-size: 22px; border-radius: 8px; font-weight: bold; box-shadow: 0 4px 0 rgba(0,0,0,0.1); }}
            
            .wave-divider {{ width: 100%; height: auto; display: block; margin-bottom: -1px; }}
            
            .bottom-section {{ background-color: #FFF5F8; padding: 40px; text-align: center; color: #1a1a1a; }}
            .bottom-section h2 {{ font-family: 'Fredoka', sans-serif; font-size: 32px; margin: 0 0 15px 0; letter-spacing: -0.5px; }}
            .bottom-section p {{ font-size: 16px; margin-bottom: 30px; color: #444; line-height: 1.5; }}
            
            .whatsapp-btn {{ display: inline-block; background-color: #25D366; color: #ffffff; text-decoration: none; padding: 16px 35px; border-radius: 50px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 15px rgba(37, 211, 102, 0.4); }}
            .whatsapp-btn:hover {{ transform: translateY(-2px); box-shadow: 0 6px 20px rgba(37, 211, 102, 0.5); }}
        </style>
    </head>
    <body>
        <div class="wrapper">
            <div class="top-bar">
                <span class="top-bar-title">Clean&Co.</span>
            </div>
            
            <div class="hero">
                <h1>Seu orçamento<br>está pronto!</h1>
                
                <img class="main-image" src="https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&q=80&w=800" alt="Limpeza Profissional">
                
                <div class="details">
                    {saudacao}<br><br>
                    Analisamos os detalhes para a <strong>{servico}</strong>{specs_str} e preparamos uma cotação exclusiva para deixar tudo brilhando.
                </div>
                
                <div class="cta-container">
                    <div class="cta-button">Valor: R$ {valor}</div>
                </div>
            </div>
            
            <!-- Wavy divider SVG -->
            <svg class="wave-divider" viewBox="0 0 1440 120" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0,64L48,69.3C96,75,192,85,288,80C384,75,480,53,576,48C672,43,768,53,864,64C960,75,1056,85,1152,80C1248,75,1344,53,1392,42.7L1440,32L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z" fill="#FFF5F8"></path>
            </svg>
    
            <div class="bottom-section">
                <h2>Vamos agendar?</h2>
                <p>Cada detalhe conta para uma limpeza perfeita. Se o valor estiver de acordo, clique abaixo para falar diretamente com a nossa equipe no WhatsApp e agendar o serviço.</p>
                <a href="https://wa.me/244927558203" class="whatsapp-btn">Falar no WhatsApp</a>
            </div>
        </div>
    </body>
    </html>
    """
    msg.add_alternative(html_content, subtype='html')
    
    # Timeout de 10s para nao travar se der pau
    with smtplib.SMTP_SSL('smtp.gmail.com', 465, timeout=10) as smtp:
        smtp.login(sender_email, app_password)
        smtp.send_message(msg)
