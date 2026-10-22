@echo off
setlocal
TITLE Stecla - Plataforma As-Built e Gestao BIM

pushd "%~dp0"

echo ================================================================
echo    STECLA ENGENHARIA E TECNOLOGIA BIM
echo    Plataforma de Verificacao As-Built e Gestao de Modelos
echo ================================================================
echo.
echo [1/3] Verificando dependencias do ambiente...
where npm >nul 2>nul
if errorlevel 1 (
    echo.
    echo [ERRO] O Node.js/npm nao foi encontrado no sistema.
    echo Por favor, instale o Node.js em: https://nodejs.org/
    echo.
    popd
    pause
    exit /b 1
)

if not exist "node_modules\.bin\vite.cmd" (
    echo.
    echo [!] Instalando dependencias do projeto na primeira execucao...
    call npm install
    echo.
)

echo [2/3] Preparando servidor de desenvolvimento local...
echo       Frontend: http://localhost:5188
echo       Backend TRPC: http://localhost:3008
echo.

start /b cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:5188"

echo [3/3] Iniciando aplicacao Vite + Node/TRPC...
echo Mantenha esta janela aberta enquanto estiver usando o sistema.
echo Pressione Ctrl+C a qualquer momento para encerrar.
echo ================================================================
echo.

call npm run dev
popd
pause
