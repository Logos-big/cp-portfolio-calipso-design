# Quick update - uses cached data if API fails
$configPath = "scripts\figma-config.json"
$dataPath = "figma-data.json"

Write-Host "=== Quick Update from Figma ===" -ForegroundColor Green
Write-Host ""

# Try to get fresh data
if (Test-Path $configPath) {
    $config = Get-Content $configPath | ConvertFrom-Json
    $fileKey = $config.fileKey
    $token = $config.token
    $nodeIds = $config.nodeIds
    
    if ($nodeIds -and $nodeIds.Count -gt 0) {
        $nodeIdsForUrl = $nodeIds | ForEach-Object { $_ -replace ":", "-" }
        $nodesParam = $nodeIdsForUrl -join ","
        $url = "https://api.figma.com/v1/files/$fileKey/nodes?ids=$nodesParam"
        $headers = @{
            "X-Figma-Token" = $token
        }
        
        try {
            Write-Host "Fetching fresh data from Figma..." -ForegroundColor Cyan
            $response = Invoke-RestMethod -Uri $url -Method Get -Headers $headers
            $response | ConvertTo-Json -Depth 100 | Out-File -FilePath $dataPath -Encoding UTF8
            Write-Host "Fresh data received!" -ForegroundColor Green
        } catch {
            Write-Host "Using cached data (API error: $($_.Exception.Message))" -ForegroundColor Yellow
        }
    }
}

# Load data
if (-not (Test-Path $dataPath)) {
    Write-Host "Error: No data file found" -ForegroundColor Red
    exit 1
}

$data = Get-Content $dataPath -Raw | ConvertFrom-Json

# Find Main node
function Find-MainNode {
    param($data)
    
    if ($data.nodes) {
        foreach ($nodeKey in $data.nodes.PSObject.Properties.Name) {
            $node = $data.nodes.$nodeKey.document
            if ($node.name -eq "Main" -and $node.type -eq "FRAME") {
                return $node
            }
        }
    }
    
    return $null
}

$mainNode = Find-MainNode -data $data

if (-not $mainNode) {
    Write-Host "Error: Main node not found" -ForegroundColor Red
    exit 1
}

Write-Host "Found Main frame" -ForegroundColor Cyan
Write-Host ""

# Generate HTML
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
            $styleAttrs += "width: ${width}.0px"
            $styleAttrs += "height: ${height}.0px"
        }
        
        if ($node.layoutMode) {
            if ($node.layoutMode -eq "HORIZONTAL") {
                $styleAttrs += "display: flex"
                $styleAttrs += "flex-direction: row"
            } elseif ($node.layoutMode -eq "VERTICAL") {
                $styleAttrs += "display: flex"
                $styleAttrs += "flex-direction: column"
            }
        }
        
        if ($node.paddingLeft) { $styleAttrs += "padding-left: $($node.paddingLeft).0px" }
        if ($node.paddingRight) { $styleAttrs += "padding-right: $($node.paddingRight).0px" }
        if ($node.paddingTop) { $styleAttrs += "padding-top: $($node.paddingTop).0px" }
        if ($node.paddingBottom) { $styleAttrs += "padding-bottom: $($node.paddingBottom).0px" }
        if ($node.itemSpacing) { $styleAttrs += "gap: $($node.itemSpacing).0px" }
        
        if ($node.counterAxisAlignItems -eq "CENTER") { $styleAttrs += "align-items: center" }
        if ($node.primaryAxisAlignItems -eq "CENTER") { $styleAttrs += "justify-content: center" }
        
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
    elseif ($node.type -eq "TEXT") {
        $className = ($node.name -replace '[^a-zA-Z0-9]', '-').ToLower()
        $text = if ($node.characters) { $node.characters } else { "" }
        $styleAttrs = @()
        
        if ($node.absoluteBoundingBox) {
            $width = $node.absoluteBoundingBox.width
            $height = $node.absoluteBoundingBox.height
            $styleAttrs += "width: ${width}.0px"
            $styleAttrs += "height: ${height}.0px"
        }
        
        if ($node.style) {
            $fontSize = if ($node.style.fontSize) { "$($node.style.fontSize).0px" } else { "16.0px" }
            $fontFamily = if ($node.style.fontFamily) { $node.style.fontFamily } else { "sans-serif" }
            $fontWeight = if ($node.style.fontWeight) { $node.style.fontWeight } else { "400" }
            $lineHeight = if ($node.style.lineHeightPx) { "$($node.style.lineHeightPx).0px" } else { "normal" }
            $letterSpacing = if ($node.style.letterSpacing) { "$($node.style.letterSpacing).0px" } else { "0.0px" }
            
            $styleAttrs += "font-size: $fontSize"
            $styleAttrs += "font-family: $fontFamily, sans-serif"
            $styleAttrs += "font-weight: $fontWeight"
            $styleAttrs += "line-height: $lineHeight"
            $styleAttrs += "letter-spacing: $letterSpacing"
            
            if ($node.style.textAlignHorizontal) {
                $styleAttrs += "text-align: $($node.style.textAlignHorizontal.ToLower())"
            }
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
        $html += "$indent<p class='$className'$style>$text</p>`n"
    }
    
    return $html
}

$htmlContent = Generate-HTMLFromNode -node $mainNode

$fullHtml = @"
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

$fullHtml | Out-File -FilePath "index.html" -Encoding UTF8

Write-Host "HTML generated and saved to index.html" -ForegroundColor Green
Write-Host ""
Write-Host "Updating Git..." -ForegroundColor Yellow

git add .
git commit -m "Update from Figma"
git push origin main

Write-Host ""
Write-Host "Done! Site updated." -ForegroundColor Green

