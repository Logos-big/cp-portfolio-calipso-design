# Скрипт деплоя на FTP хостинг
# Использование: .\scripts\deploy.ps1

param(
    [string]$ConfigPath = "deploy-config.json"
)

# Проверка наличия конфигурации
if (-not (Test-Path $ConfigPath)) {
    Write-Host "Ошибка: Файл конфигурации $ConfigPath не найден!" -ForegroundColor Red
    Write-Host "Скопируйте deploy-config.json.example в deploy-config.json и заполните данные" -ForegroundColor Yellow
    exit 1
}

# Загрузка конфигурации
$config = Get-Content $ConfigPath | ConvertFrom-Json

Write-Host "Начинаю деплой на хостинг..." -ForegroundColor Green
Write-Host "Хост: $($config.host)" -ForegroundColor Cyan

# Создание временной папки для файлов
$tempDir = ".\temp_deploy"
if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

try {
    # Копирование файлов (исключая указанные в exclude)
    Write-Host "Подготовка файлов..." -ForegroundColor Yellow
    
    $files = Get-ChildItem -Path $config.localPath -Recurse -File | Where-Object {
        $relativePath = $_.FullName.Replace((Resolve-Path $config.localPath).Path + "\", "")
        $shouldExclude = $false
        
        foreach ($pattern in $config.exclude) {
            if ($relativePath -like $pattern -or $_.Name -like $pattern) {
                $shouldExclude = $true
                break
            }
        }
        
        -not $shouldExclude
    }
    
    foreach ($file in $files) {
        $relativePath = $file.FullName.Replace((Resolve-Path $config.localPath).Path + "\", "")
        $destPath = Join-Path $tempDir $relativePath
        $destDir = Split-Path $destPath -Parent
        
        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }
        
        Copy-Item $file.FullName -Destination $destPath -Force
    }
    
    Write-Host "Файлы подготовлены: $($files.Count) файлов" -ForegroundColor Green
    
    # Загрузка через FTP
    Write-Host "Подключение к FTP серверу..." -ForegroundColor Yellow
    
    $ftpRequest = [System.Net.FtpWebRequest]::Create("ftp://$($config.host)$($config.remotePath)/")
    $ftpRequest.Credentials = New-Object System.Net.NetworkCredential($config.user, $config.password)
    $ftpRequest.Method = [System.Net.WebRequestMethods+Ftp]::ListDirectory
    
    try {
        $response = $ftpRequest.GetResponse()
        $response.Close()
        Write-Host "Подключение успешно!" -ForegroundColor Green
    } catch {
        Write-Host "Ошибка подключения: $_" -ForegroundColor Red
        exit 1
    }
    
    # Загрузка файлов
    $uploaded = 0
    foreach ($file in (Get-ChildItem -Path $tempDir -Recurse -File)) {
        $relativePath = $file.FullName.Replace((Resolve-Path $tempDir).Path + "\", "").Replace("\", "/")
        $remoteFile = "$($config.remotePath)/$relativePath"
        
        try {
            $ftpRequest = [System.Net.FtpWebRequest]::Create("ftp://$($config.host)$remoteFile")
            $ftpRequest.Credentials = New-Object System.Net.NetworkCredential($config.user, $config.password)
            $ftpRequest.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
            $ftpRequest.UseBinary = $true
            $ftpRequest.UsePassive = $true
            
            $fileContent = [System.IO.File]::ReadAllBytes($file.FullName)
            $ftpRequest.ContentLength = $fileContent.Length
            
            $requestStream = $ftpRequest.GetRequestStream()
            $requestStream.Write($fileContent, 0, $fileContent.Length)
            $requestStream.Close()
            
            $response = $ftpRequest.GetResponse()
            $response.Close()
            
            $uploaded++
            Write-Host "  ✓ $relativePath" -ForegroundColor Gray
        } catch {
            Write-Host "  ✗ Ошибка загрузки $relativePath : $_" -ForegroundColor Red
        }
    }
    
    Write-Host "`nДеплой завершен! Загружено файлов: $uploaded" -ForegroundColor Green
    
} finally {
    # Очистка временной папки
    if (Test-Path $tempDir) {
        Remove-Item $tempDir -Recurse -Force
    }
}

Write-Host "`nСайт должен быть доступен на вашем хостинге!" -ForegroundColor Cyan

