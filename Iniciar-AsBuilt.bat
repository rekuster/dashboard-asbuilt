@echo off
chcp 65001 >nul
TITLE Stecla - Plataforma As-Built ^& Gestao BIM
cd /d "%~dp0"

echo ================================================================
echo    STECLA ENGENHARIA ^& TECNOLOGIA BIM
echo    Plataforma de Verificacao As-Built ^& Gestao de Modelos
echo ================================================================
echo.
echo [1/3] Verificando dependencias do ambiente...
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERRO] O Node.js/npm nao foi encontrado no sistema.
    echo Por favor, instale o Node.js em: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [2/3] Preparando servidor de desenvolvimento local...
echo       Frontend: http://localhost:5188
echo       Backend TRPC: http://localhost:3008
echo.

:: Aguarda 3 segundos em segundo plano antes de abrir o navegador
start /b cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:5188"

echo [3/3] Iniciando aplicacao (Vite + Node/TRPC)...
echo Pressione Ctrl+C a qualquer momento para encerrar.
echo ================================================================
echo.

npm run dev
pause
