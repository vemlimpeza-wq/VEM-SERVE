@echo off
title Assistente de Deploy Vercel — Vem Limpeza
color 05
echo =========================================================
echo       ASSISTENTE DE DEPLOY VERCEL -- VEM LIMPEZA
echo =========================================================
echo.
echo Este assistente instalara a Vercel CLI e realizara o deploy
echo do seu projeto diretamente da sua maquina de forma segura.
echo.
echo Pressione qualquer tecla para iniciar...
pause > nul

echo.
echo [1/3] Acessando a pasta do aplicativo...
cd VemLimpeza-app

echo.
echo [2/3] Instalando a ferramenta oficial Vercel CLI globalmente...
call npm install -g vercel

echo.
echo [3/3] Iniciando o deploy na Vercel...
echo ---------------------------------------------------------
echo ATENCAO: Siga as instrucoes na tela do terminal:
echo 1. Selecione login por e-mail ou conta do GitHub.
echo 2. Responda 'Y' para iniciar a configuracao do projeto.
echo 3. Aceite os valores padrao pressionando ENTER nas perguntas.
echo ---------------------------------------------------------
echo.
call vercel

echo.
echo =========================================================
echo    PROCESSO DE DEPLOY CONCLUIDO!
echo =========================================================
echo.
pause
