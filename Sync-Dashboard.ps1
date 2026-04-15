# ---------------------------------------------------------
# SCRIPT DE SINCRONIZAÇÃO AUTOMÁTICA - DASHBOARD AS-BUILT
# ---------------------------------------------------------
# Como usar:
# 1. Ajuste o caminho da sua planilha abaixo ($FilePath)
# 2. Clique com botão direito neste arquivo e selecione "Executar com o PowerShell"
# 3. Sempre que você salvar a planilha, o dashboard será atualizado automaticamente!

# CONFIGURAÇÕES
$FilePath = "D:\STECLA IA\Dashboard-AsBuilt-Custom\Planilhas\Mapeamento Modelos As Built.xlsx"
$ApiUrl = "http://localhost:3008/api/external/upload-excel"
$ApiKey = "antigravity-sync-2024"

# ---------------------------------------------------------

Clear-Host
Write-Host "🚀 Iniciando Sincronizador Automático..." -ForegroundColor Cyan
Write-Host "📂 Monitorando: $FilePath" -ForegroundColor Yellow

if (!(Test-Path $FilePath)) {
    Write-Host "❌ ERRO: O arquivo especificado não foi encontrado!" -ForegroundColor Red
    Write-Host "Ajuste a variável `$FilePath` no início deste script." -ForegroundColor Gray
    Read-Host "Pressione Enter para sair..."
    exit
}

$file = Get-Item $FilePath
$folder = $file.DirectoryName
$filter = $file.Name

$watcher = New-Object IO.FileSystemWatcher
$watcher.Path = $folder
$watcher.Filter = $filter
$watcher.IncludeSubdirectories = $false
$watcher.EnableRaisingEvents = $true

$onChanged = Register-ObjectEvent $watcher "Changed" -Action {
    $path = $Event.SourceEventArgs.FullPath
    $name = $Event.SourceEventArgs.Name
    
    # Pequeno delay para garantir que o Excel soltou o arquivo após o save
    Start-Sleep -Milliseconds 500
    
    Write-Host "`n🕒 [$(Get-Date -Format 'HH:mm:ss')] Mudança detectada no arquivo: $name" -ForegroundColor White
    Write-Host "📡 Enviando dados para o Dashboard..." -ForegroundColor Blue

    try {
        $boundary = [System.Guid]::NewGuid().ToString()
        $LF = "`r`n"
        
        $fileBytes = [System.IO.File]::ReadAllBytes($path)
        $fileHeader = "--$boundary$LF" +
        "Content-Disposition: form-data; name=`"file`"; filename=`"$name`"$LF" +
        "Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet$LF$LF"
        $fileFooter = "$LF--$boundary--$LF"
        
        $encoding = [System.Text.Encoding]::GetEncoding('iso-8859-1')
        $body = $encoding.GetBytes($fileHeader) + $fileBytes + $encoding.GetBytes($fileFooter)

        $response = Invoke-RestMethod -Uri $ApiUrl -Method Post -Body $body -Headers @{
            "x-api-key"    = $ApiKey
            "Content-Type" = "multipart/form-data; boundary=$boundary"
        }
        
        if ($response.success) {
            Write-Host "✅ SUCESSO! Dashboard atualizado." -ForegroundColor Green
            Write-Host "📈 Status: $($response.totalSalas) salas e $($response.totalApontamentos) apontamentos sincronizados." -ForegroundColor Gray
            
            # Windows Notification (Opcional)
            $ws = New-Object -ComObject WScript.Shell
            $ws.Popup("Dashboard Atualizado! ($($response.totalSalas) salas)", 3, "Sync Dashboard", 64)
        }
        else {
            Write-Host "⚠️ O servidor retornou um aviso, mas pode não ter processado tudo." -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "❌ ERRO ao enviar dados: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.ErrorDetails) { Write-Host "Detalhes: $($_.ErrorDetails)" -ForegroundColor Red }
    }
}

Write-Host "✅ Monitoramento ativo! Agora você pode trabalhar no Excel livremente." -ForegroundColor Green
Write-Host "Pressione CTRL+C para parar o sincronizador." -ForegroundColor Gray

# Loop infinito para manter o script rodando
try {
    while ($true) { Start-Sleep -Seconds 1 }
}
finally {
    Unregister-Event -SourceIdentifier $onChanged.Name
    $watcher.Dispose()
    Write-Host "`n🛑 Sincronizador parado." -ForegroundColor Red
}
