# Figma Sync Script for PowerShell
# Usage: .\scripts\figma-sync.ps1

$configPath = Join-Path $PSScriptRoot "figma-config.json"

if (-not (Test-Path $configPath)) {
    Write-Host "Error: Config file not found" -ForegroundColor Red
    Write-Host "Copy scripts/figma-config.json.example to scripts/figma-config.json" -ForegroundColor Yellow
    exit 1
}

$config = Get-Content $configPath | ConvertFrom-Json

$fileKey = $config.fileKey
$token = $config.token

if (-not $fileKey -or $fileKey -eq "YOUR_FIGMA_FILE_KEY") {
    Write-Host "Error: Set FILE_KEY in scripts/figma-config.json" -ForegroundColor Red
    exit 1
}

if (-not $token -or $token -eq "YOUR_FIGMA_TOKEN") {
    Write-Host "Error: Set TOKEN in scripts/figma-config.json" -ForegroundColor Red
    exit 1
}

Write-Host "Loading data from Figma..." -ForegroundColor Green
Write-Host ""

# Получение данных конкретного узла, если указан
$nodeIds = $config.nodeIds
if ($nodeIds -and $nodeIds.Count -gt 0) {
    $nodesParam = $nodeIds -join ","
    $url = "https://api.figma.com/v1/files/$fileKey/nodes?ids=$nodesParam"
} else {
    $url = "https://api.figma.com/v1/files/$fileKey"
}

$headers = @{
    "X-Figma-Token" = $token
}

try {
    Write-Host "Connecting to Figma API..." -ForegroundColor Yellow
    if ($nodeIds -and $nodeIds.Count -gt 0) {
        Write-Host "Fetching specific nodes: $nodesParam" -ForegroundColor Cyan
    }
    $response = Invoke-RestMethod -Uri $url -Method Get -Headers $headers
    
    Write-Host "Data received!" -ForegroundColor Green
    Write-Host ""
    
    $dataPath = Join-Path (Split-Path $PSScriptRoot -Parent) "figma-data.json"
    $response | ConvertTo-Json -Depth 100 | Out-File -FilePath $dataPath -Encoding UTF8
    Write-Host "Data saved to figma-data.json" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "Extracting data from design..." -ForegroundColor Yellow
    
    $colors = @{}
    $typography = @{}
    $spacing = @{}
    
    function Extract-NodeData {
        param($node)
        
        if ($node.fills -and $node.fills.Count -gt 0) {
            $fill = $node.fills[0]
            if ($fill.type -eq "SOLID" -and $fill.color) {
                $rVal = [math]::Round($fill.color.r * 255)
                $gVal = [math]::Round($fill.color.g * 255)
                $bVal = [math]::Round($fill.color.b * 255)
                $r = [int]$rVal
                $g = [int]$gVal
                $b = [int]$bVal
                
                function ToHex {
                    param($value)
                    $hex = [Convert]::ToString($value, 16).ToUpper()
                    if ($hex.Length -eq 1) { return "0" + $hex }
                    return $hex
                }
                
                $hex = "#" + (ToHex $r) + (ToHex $g) + (ToHex $b)
                
                $name = if ($node.name) { $node.name } else { "unnamed" }
                $colors[$name] = @{
                    hex = $hex
                    rgb = "rgb($r, $g, $b)"
                    opacity = if ($fill.opacity) { $fill.opacity } else { 1 }
                }
            }
        }
        
        if ($node.type -eq "TEXT" -and $node.style) {
            $name = if ($node.name) { $node.name } else { "unnamed" }
            $typography[$name] = @{
                fontFamily = if ($node.style.fontFamily) { $node.style.fontFamily } else { "Inter" }
                fontSize = if ($node.style.fontSize) { $node.style.fontSize } else { 16 }
                fontWeight = if ($node.style.fontWeight) { $node.style.fontWeight } else { 400 }
                lineHeight = if ($node.style.lineHeightPx) { $node.style.lineHeightPx } else { if ($node.style.fontSize) { $node.style.fontSize } else { 16 } }
            }
        }
        
        if ($node.absoluteBoundingBox) {
            $name = if ($node.name) { $node.name } else { "unnamed" }
            $spacing[$name] = @{
                width = $node.absoluteBoundingBox.width
                height = $node.absoluteBoundingBox.height
            }
        }
        
        if ($node.children) {
            foreach ($child in $node.children) {
                Extract-NodeData -node $child
            }
        }
    }
    
    # Обработка документа или конкретных узлов
    if ($response.nodes) {
        # Если запрашивались конкретные узлы
        foreach ($nodeKey in $response.nodes.PSObject.Properties.Name) {
            $nodeData = $response.nodes.$nodeKey.document
            if ($nodeData) {
                Extract-NodeData -node $nodeData
            }
        }
    } elseif ($response.document) {
        # Если запрашивался весь файл
        Extract-NodeData -node $response.document
    }
    
    Write-Host "Found:" -ForegroundColor Green
    Write-Host "  - Colors: $($colors.Count)" -ForegroundColor Cyan
    Write-Host "  - Typography: $($typography.Count)" -ForegroundColor Cyan
    Write-Host "  - Components: $($spacing.Count)" -ForegroundColor Cyan
    Write-Host ""
    
    $css = ":root {`n"
    $css += "`n  /* Colors from Figma */`n"
    
    foreach ($colorName in $colors.Keys) {
        $varName = "--color-" + ($colorName -replace '\s+', '-').ToLower()
        $css += "  $varName : $($colors[$colorName].hex);`n"
    }
    
    $css += "`n  /* Typography from Figma */`n"
    foreach ($typeName in $typography.Keys) {
        $varName = "--font-" + ($typeName -replace '\s+', '-').ToLower()
        $css += "  $varName-family : '$($typography[$typeName].fontFamily)', sans-serif;`n"
        $css += "  $varName-size : $($typography[$typeName].fontSize)px;`n"
        $css += "  $varName-weight : $($typography[$typeName].fontWeight);`n"
    }
    
    $css += "`n  /* Spacing from Figma */`n"
    foreach ($spaceName in $spacing.Keys) {
        $varName = "--spacing-" + ($spaceName -replace '\s+', '-').ToLower()
        $css += "  $varName-width : $($spacing[$spaceName].width)px;`n"
        $css += "  $varName-height : $($spacing[$spaceName].height)px;`n"
    }
    
    $css += "}`n"
    
    $stylesDir = Join-Path (Split-Path $PSScriptRoot -Parent) "styles"
    if (-not (Test-Path $stylesDir)) {
        New-Item -ItemType Directory -Path $stylesDir | Out-Null
    }
    
    $cssPath = Join-Path $stylesDir "figma-variables.css"
    $css | Out-File -FilePath $cssPath -Encoding UTF8
    Write-Host "CSS variables saved to styles/figma-variables.css" -ForegroundColor Green
    Write-Host ""
    Write-Host "Done! Figma data synchronized." -ForegroundColor Green
    Write-Host ""
    Write-Host "Use variables in CSS:" -ForegroundColor Cyan
    Write-Host '  color: var(--color-primary);' -ForegroundColor White
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "Check token validity" -ForegroundColor Yellow
    } elseif ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "Check File Key validity" -ForegroundColor Yellow
    }
    exit 1
}

