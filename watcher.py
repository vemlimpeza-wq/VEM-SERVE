import time
from main import main as executar_robo

def start_watcher(intervalo_minutos=1):
    print("========================================")
    print(f"GATILHO ATIVADO: Monitorando a planilha a cada {intervalo_minutos} minuto(s).")
    print("Pressione CTRL+C para parar.")
    print("========================================\n")
    
    while True:
        try:
            # Chama a funcao principal do robo
            executar_robo()
        except Exception as e:
            print(f"Erro na execução do Gatilho: {e}")
            
        print(f"\nAguardando {intervalo_minutos} minuto(s) para a próxima checagem...\n")
        time.sleep(intervalo_minutos * 60)

if __name__ == "__main__":
    try:
        start_watcher(intervalo_minutos=1)
    except KeyboardInterrupt:
        print("\nGatilho desligado pelo usuário.")
