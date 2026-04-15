@echo off
echo ==========================================
echo   CORRECAO DAS ENTREGAS AS-BUILT
echo ==========================================
echo.
echo Iniciando a importacao da planilha:
echo "D:\STECLA IA\Dashboard-AsBuilt-Custom\Planilhas\Mapeamento Modelos As Built.xlsx"
echo.
npx tsx import-deliveries-v2.ts
echo.
echo ==========================================
echo   PROCESSO CONCLUIDO!
echo ==========================================
pause
