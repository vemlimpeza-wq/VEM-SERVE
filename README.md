# 🚀 Clean&Co. | Orquestrador de Orçamentos Web

Este diretório contém o painel web premium, moderno e cinematográfico para gerenciar o disparador de orçamentos diretamente da nuvem, eliminando a necessidade de rodar scripts Python locais.

A arquitetura é **100% Serverless**:
- **Frontend**: Hospedado na Vercel (distribuído globalmente por CDN).
- **Backend/API**: Executado diretamente na infraestrutura do Google via **Google Apps Script** acoplado à planilha.

---

## 📋 Passo 1: Configurar a Planilha (Google Apps Script)

Para ligar o seu painel à planilha e permitir o envio de e-mails diretamente pelo Gmail do Google:

1. Abra a sua planilha do Google Sheets.
2. No menu superior, clique em **Extensões** -> **Apps Script**.
3. Apague qualquer código existente no editor.
4. Abra o arquivo [google_apps_script.js](google_apps_script.js) criado neste diretório, copie todo o conteúdo e cole-o no editor do Apps Script.
5. Clique no ícone de disquete (**Salvar projeto**) no topo do editor.
6. No canto superior direito, clique no botão azul **Implantar** -> **Nova implantação**.
7. Clique no ícone de engrenagem ao lado de "Selecionar tipo" e escolha **Aplicativo da Web**.
8. Preencha as seguintes configurações:
   - **Descrição**: `Disparador de Orçamento API`
   - **Executar como**: `Eu` (sua conta Google)
   - **Quem tem acesso**: `Qualquer pessoa` (isso é necessário para que o painel consiga se comunicar com a planilha).
9. Clique em **Implantar**.
10. O Google solicitará que você autorize o acesso. Clique em **Autorizar acesso**, selecione a sua conta Google, clique em **Avançado** (no link pequeno abaixo) e depois em **Acessar Projeto sem nome (não seguro)**. Conceda as permissões necessárias.
11. Ao concluir, o Google exibirá a tela "Implantação concluída com sucesso".
12. **IMPORTANTE:** Copie a **URL do aplicativo da Web** gerada (ela termina em `/exec`). Você usará esta URL no painel.

---

## 💻 Passo 2: Executar Localmente

Para abrir a interface no seu navegador a partir do seu computador:

1. Clique com o botão direito no arquivo `index.html` e escolha **Abrir com** -> Seu navegador de preferência (Chrome, Edge, etc.).
2. Ou clique diretamente no link local abaixo:
   - [Visualizar Painel Localmente (index.html)](file:///d:/Disparador%20de%20Or%C3%A7amento/index.html)
3. No canto superior direito, clique no ícone de **Engrenagem** (Configurações).
4. Cole a **URL do aplicativo da Web** que você copiou no *Passo 1* e clique em **Salvar Conexão**.
5. O painel piscará em verde como **Sincronizado** e listará todos os pedidos da planilha instantaneamente!

---

## ☁️ Passo 3: Publicar no GitHub e Vercel

### Publicar no GitHub
1. Crie um novo repositório público ou privado no seu GitHub.
2. Inicialize o Git na pasta raiz do projeto e envie os arquivos para o repositório:
   ```bash
   git init
   git add .
   git commit -m "feat: adicionar orquestrador de orçamentos web"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
   git push -u origin main
   ```

### Hospedar Gratuitamente na Vercel
1. Acesse o site da [Vercel](https://vercel.com/) e faça login com sua conta do GitHub.
2. Clique em **Add New...** -> **Project**.
3. Importe o repositório que você acabou de criar.
4. Nas configurações do projeto na Vercel, você não precisa alterar nada! A Vercel detectará automaticamente os arquivos estáticos (`index.html`, `app.js`).
5. Clique em **Deploy**.
6. Em menos de 1 minuto, seu aplicativo estará online com um link público seguro (ex: `https://seu-projeto.vercel.app`).
7. Acesse o link gerado, abra as configurações no canto superior direito e cole a URL do seu Google Apps Script. A configuração ficará salva de forma segura no navegador!
