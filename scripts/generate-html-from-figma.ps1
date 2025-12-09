# Генерация HTML на основе данных из Figma
# Использование: .\scripts\generate-html-from-figma.ps1

$dataPath = Join-Path (Split-Path $PSScriptRoot -Parent) "figma-data.json"

if (-not (Test-Path $dataPath)) {
    Write-Host "Error: figma-data.json not found. Run figma-sync.ps1 first." -ForegroundColor Red
    exit 1
}

Write-Host "Generating HTML from Figma data..." -ForegroundColor Green

$data = Get-Content $dataPath | ConvertFrom-Json

# Функция для поиска узла по ID
function Find-NodeById {
    param($node, $targetId)
    
    if ($node.id -eq $targetId) {
        return $node
    }
    
    if ($node.children) {
        foreach ($child in $node.children) {
            $found = Find-NodeById -node $child -targetId $targetId
            if ($found) {
                return $found
            }
        }
    }
    
    return $null
}

# Поиск стартовой страницы (node-id=67-5539)
$startPageId = "67:5539"
$startPage = $null

if ($data.nodes) {
    foreach ($nodeKey in $data.nodes.PSObject.Properties.Name) {
        $nodeData = $data.nodes.$nodeKey.document
        if ($nodeData.id -eq $startPageId) {
            $startPage = $nodeData
            break
        }
        $found = Find-NodeById -node $nodeData -targetId $startPageId
        if ($found) {
            $startPage = $found
            break
        }
    }
} elseif ($data.document) {
    $startPage = Find-NodeById -node $data.document -targetId $startPageId
}

if (-not $startPage) {
    Write-Host "Warning: Start page node not found. Using full document structure." -ForegroundColor Yellow
    $startPage = $data.document
}

# Генерация HTML
function Generate-HTML {
    param($node, $level = 0)
    
    $html = ""
    $indent = "  " * $level
    
    if ($node.type -eq "TEXT") {
        $text = if ($node.characters) { $node.characters } else { "" }
        $style = ""
        
        if ($node.style) {
            $fontSize = if ($node.style.fontSize) { "$($node.style.fontSize)px" } else { "16px" }
            $fontFamily = if ($node.style.fontFamily) { $node.style.fontFamily } else { "sans-serif" }
            $fontWeight = if ($node.style.fontWeight) { $node.style.fontWeight } else { "400" }
            $color = if ($node.fills -and $node.fills[0].color) {
                $c = $node.fills[0].color
                $r = [math]::Round($c.r * 255)
                $g = [math]::Round($c.g * 255)
                $b = [math]::Round($c.b * 255)
                "rgb($r, $g, $b)"
            } else { "inherit" }
            
            $style = " style='font-size: $fontSize; font-family: $fontFamily; font-weight: $fontWeight; color: $color;'"
        }
        
        $tag = if ($level -eq 0) { "h1" } elseif ($level -eq 1) { "h2" } elseif ($level -eq 2) { "h3" } else { "p" }
        $html += "$indent<$tag$style>$text</$tag>`n"
    }
    elseif ($node.type -eq "FRAME" -or $node.type -eq "GROUP") {
        $className = ($node.name -replace '[^a-zA-Z0-9]', '-').ToLower()
        $html += "$indent<div class='$className'>`n"
        
        if ($node.children) {
            foreach ($child in $node.children) {
                $html += Generate-HTML -node $child -level ($level + 1)
            }
        }
        
        $html += "$indent</div>`n"
    }
    elseif ($node.type -eq "RECTANGLE" -or $node.type -eq "ELLIPSE") {
        $className = ($node.name -replace '[^a-zA-Z0-9]', '-').ToLower()
        $html += "$indent<div class='$className shape'></div>`n"
    }
    
    return $html
}

$htmlContent = Generate-HTML -node $startPage

# Сохранение HTML
$htmlPath = Join-Path (Split-Path $PSScriptRoot -Parent) "index-from-figma.html"
$htmlContent | Out-File -FilePath $htmlPath -Encoding UTF8

Write-Host "HTML generated: index-from-figma.html" -ForegroundColor Green

