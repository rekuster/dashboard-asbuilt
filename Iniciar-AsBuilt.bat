@echo off
TITLE Dashboard As-Built (Supernova F3)
cd /d "%~dp0"

echo 🚀 Iniciando o Dashboard As-Built - Neodent...
echo ------------------------------------------------
echo 🔗 Abrindo interface em: http://localhost:5188
echo 📂 Sincronizacao Excel: Ativa na porta 3008
echo ------------------------------------------------

:: Garante que o Node esta no PATH
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERRO] npm nao encontrado. Por favor, instale o Node.js.
    pause
    exit
)

:: Abre o navegador no link correto apos um pequeno delay
start "" "http://localhost:5188"

:: Inicia o projeto
npm run dev
pause
