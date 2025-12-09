# Автоматическая генерация HTML из макета Main в Figma
# Использование: .\scripts\build-from-figma.ps1

$dataPath = Join-Path (Split-Path $PSScriptRoot -Parent) "figma-data.json"

if (-not (Test-Path $dataPath)) {
    Write-Host "Error: figma-data.json not found. Run figma-sync.ps1 first." -ForegroundColor Red
    exit 1
}

Write-Host "Building HTML from Figma Main frame..." -ForegroundColor Green

$jsonContent = Get-Content $dataPath -Raw
$data = $jsonContent | ConvertFrom-Json

# Функция для поиска узла Main
function Find-MainNode {
    param($node)
    
    if ($node.name -eq "Main" -and $node.type -eq "FRAME") {
        return $node
    }
    
    if ($node.children) {
        foreach ($child in $node.children) {
            $found = Find-MainNode -node $child
            if ($found) {
                return $found
            }
        }
    }
    
    return $null
}

# Поиск Main
$mainNode = Find-MainNode -node $data.document

if (-not $mainNode) {
    Write-Host "Error: Main frame not found in data" -ForegroundColor Red
    exit 1
}

Write-Host "Found Main frame" -ForegroundColor Cyan
Write-Host "  Width: $($mainNode.absoluteBoundingBox.width)px" -ForegroundColor White
Write-Host "  Height: $($mainNode.absoluteBoundingBox.height)px" -ForegroundColor White
Write-Host "  Children: $($mainNode.children.Count)" -ForegroundColor White

# Генерация HTML
function Generate-HTMLFromNode {
    param($node, $level = 0)
    
    $html = ""
    $indent = "    " * $level
    
    if ($node.type -eq "FRAME" -or $node.type -eq "GROUP") {
        $className = ($node.name -replace '[^a-zA-Z0-9]', '-').ToLower()
        $styleAttrs = @()
        
        if ($node.absoluteBoundingBox) {
            $width = $node.absoluteBoundingBox.width
            $height = $node.absoluteBoundingBox.height
            $styleAttrs += "width: ${width}px"
            $styleAttrs += "height: ${height}px"
        }
        
        if ($node.backgroundColor) {
            $c = $node.backgroundColor
            $r = [math]::Round($c.r * 255)
            $g = [math]::Round($c.g * 255)
            $b = [math]::Round($c.b * 255)
            $hex = "#" + ([Convert]::ToString($r, 16).PadLeft(2, '0')) + ([Convert]::ToString($g, 16).PadLeft(2, '0')) + ([Convert]::ToString($b, 16).PadLeft(2, '0'))
            $styleAttrs += "background-color: $hex"
        } elseif ($node.background -and $node.background.Count -gt 0 -and $node.background[0].type -eq "SOLID") {
            $c = $node.background[0].color
            $r = [math]::Round($c.r * 255)
            $g = [math]::Round($c.g * 255)
            $b = [math]::Round($c.b * 255)
            $hex = "#" + ([Convert]::ToString($r, 16).PadLeft(2, '0')) + ([Convert]::ToString($g, 16).PadLeft(2, '0')) + ([Convert]::ToString($b, 16).PadLeft(2, '0'))
            $styleAttrs += "background-color: $hex"
        }
        
        $style = if ($styleAttrs.Count -gt 0) { " style='" + ($styleAttrs -join "; ") + "'" } else { "" }
        
        $html += "$indent<div class='$className'$style>`n"
        
        if ($node.children) {
            foreach ($child in $node.children) {
                $html += Generate-HTMLFromNode -node $child -level ($level + 1)
            }
        }
        
        $html += "$indent</div>`n"
    }
    elseif ($node.type -eq "RECTANGLE" -or $node.type -eq "ELLIPSE" -or $node.type -eq "VECTOR") {
        $className = ($node.name -replace '[^a-zA-Z0-9]', '-').ToLower()
        $styleAttrs = @()
        
        if ($node.absoluteBoundingBox) {
            $width = $node.absoluteBoundingBox.width
            $height = $node.absoluteBoundingBox.height
            $styleAttrs += "width: ${width}px"
            $styleAttrs += "height: ${height}px"
        }
        
        if ($node.fills -and $node.fills.Count -gt 0 -and $node.fills[0].type -eq "SOLID") {
            $c = $node.fills[0].color
            $r = [math]::Round($c.r * 255)
            $g = [math]::Round($c.g * 255)
            $b = [math]::Round($c.b * 255)
            $hex = "#" + ([Convert]::ToString($r, 16).PadLeft(2, '0')) + ([Convert]::ToString($g, 16).PadLeft(2, '0')) + ([Convert]::ToString($b, 16).PadLeft(2, '0'))
            $styleAttrs += "background-color: $hex"
        }
        
        $style = if ($styleAttrs.Count -gt 0) { " style='" + ($styleAttrs -join "; ") + "'" } else { "" }
        
        $html += "$indent<div class='$className'$style></div>`n"
    }
    elseif ($node.type -eq "TEXT") {
        $className = ($node.name -replace '[^a-zA-Z0-9]', '-').ToLower()
        $text = if ($node.characters) { $node.characters } else { "" }
        $styleAttrs = @()
        
        if ($node.style) {
            $fontSize = if ($node.style.fontSize) { "$($node.style.fontSize)px" } else { "16px" }
            $fontFamily = if ($node.style.fontFamily) { $node.style.fontFamily } else { "sans-serif" }
            $fontWeight = if ($node.style.fontWeight) { $node.style.fontWeight } else { "400" }
            $styleAttrs += "font-size: $fontSize"
            $styleAttrs += "font-family: $fontFamily"
            $styleAttrs += "font-weight: $fontWeight"
        }
        
        if ($node.fills -and $node.fills.Count -gt 0 -and $node.fills[0].type -eq "SOLID") {
            $c = $node.fills[0].color
            $r = [math]::Round($c.r * 255)
            $g = [math]::Round($c.g * 255)
            $b = [math]::Round($c.b * 255)
            $hex = "#" + ([Convert]::ToString($r, 16).PadLeft(2, '0')) + ([Convert]::ToString($g, 16).PadLeft(2, '0')) + ([Convert]::ToString($b, 16).PadLeft(2, '0'))
            $styleAttrs += "color: $hex"
        }
        
        $style = if ($styleAttrs.Count -gt 0) { " style='" + ($styleAttrs -join "; ") + "'" } else { "" }
        
        $tag = if ($level -eq 0) { "h1" } elseif ($level -eq 1) { "h2" } else { "p" }
        $html += "$indent<$tag class='$className'$style>$text</$tag>`n"
    }
    elseif ($node.type -eq "COMPONENT" -or $node.type -eq "INSTANCE") {
        $className = ($node.name -replace '[^a-zA-Z0-9]', '-').ToLower()
        $html += "$indent<div class='$className component'>`n"
        
        if ($node.children) {
            foreach ($child in $node.children) {
                $html += Generate-HTMLFromNode -node $child -level ($level + 1)
            }
        }
        
        $html += "$indent</div>`n"
    }
    
    return $html
}

$htmlContent = Generate-HTMLFromNode -node $mainNode

# Создание полного HTML документа
$fullHTML = @"
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Calipso Design</title>
    <link rel="stylesheet" href="styles/figma-variables.css">
    <link rel="stylesheet" href="styles/main.css">
</head>
<body>
$htmlContent
</body>
</html>
"@

# Сохранение HTML
$htmlPath = Join-Path (Split-Path $PSScriptRoot -Parent) "index.html"
$fullHTML | Out-File -FilePath $htmlPath -Encoding UTF8

Write-Host ""
Write-Host "HTML generated: index.html" -ForegroundColor Green
