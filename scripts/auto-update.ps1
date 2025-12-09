# Auto-update script from Figma
# Usage: .\scripts\auto-update.ps1

$configPath = Join-Path $PSScriptRoot "figma-config.json"
$dataPath = Join-Path (Split-Path $PSScriptRoot -Parent) "figma-data.json"

Write-Host "=== Auto-update from Figma ===" -ForegroundColor Green
Write-Host ""

# Step 1: Sync data from Figma
Write-Host "Step 1: Syncing data from Figma..." -ForegroundColor Yellow

if (-not (Test-Path $configPath)) {
    Write-Host "Error: Config file not found" -ForegroundColor Red
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

# Get data for Main node
$nodeIds = $config.nodeIds
if (-not $nodeIds -or $nodeIds.Count -eq 0) {
    $nodeIds = @("67:5539")
}

# Convert nodeIds format for URL (67:5539 -> 67-5539)
$nodeIdsForUrl = $nodeIds | ForEach-Object { $_ -replace ":", "-" }
$nodesParam = $nodeIdsForUrl -join ","
$url = "https://api.figma.com/v1/files/$fileKey/nodes?ids=$nodesParam"
$headers = @{
    "X-Figma-Token" = $token
}

try {
    Write-Host "  Connecting to Figma API..." -ForegroundColor Cyan
    $response = Invoke-RestMethod -Uri $url -Method Get -Headers $headers
    
    Write-Host "  Data received!" -ForegroundColor Green
    
    # Save data
    $response | ConvertTo-Json -Depth 100 | Out-File -FilePath $dataPath -Encoding UTF8
    Write-Host "  Data saved to figma-data.json" -ForegroundColor Green
    Write-Host ""
    
} catch {
    Write-Host "Sync error: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Generate HTML from data
Write-Host "Step 2: Generating HTML from Main frame..." -ForegroundColor Yellow

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
    Write-Host "Error: Main node not found in data" -ForegroundColor Red
    exit 1
}

Write-Host "  Found Main frame" -ForegroundColor Cyan
Write-Host "  Size: $($mainNode.absoluteBoundingBox.width)x$($mainNode.absoluteBoundingBox.height)px" -ForegroundColor White
Write-Host "  Elements: $($mainNode.children.Count)" -ForegroundColor White
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
            $styleAttrs += "width: ${width}px"
            $styleAttrs += "height: ${height}px"
        }
        
        # Layout mode
        if ($node.layoutMode) {
            if ($node.layoutMode -eq "HORIZONTAL") {
                $styleAttrs += "display: flex"
                $styleAttrs += "flex-direction: row"
            } elseif ($node.layoutMode -eq "VERTICAL") {
                $styleAttrs += "display: flex"
                $styleAttrs += "flex-direction: column"
            }
        }
        
        # Padding
        if ($node.paddingLeft) { $styleAttrs += "padding-left: $($node.paddingLeft)px" }
        if ($node.paddingRight) { $styleAttrs += "padding-right: $($node.paddingRight)px" }
        if ($node.paddingTop) { $styleAttrs += "padding-top: $($node.paddingTop)px" }
        if ($node.paddingBottom) { $styleAttrs += "padding-bottom: $($node.paddingBottom)px" }
        
        # Gap
        if ($node.itemSpacing) { $styleAttrs += "gap: $($node.itemSpacing)px" }
        
        # Align items
        if ($node.counterAxisAlignItems) {
            if ($node.counterAxisAlignItems -eq "CENTER") {
                $styleAttrs += "align-items: center"
            }
        }
        if ($node.primaryAxisAlignItems) {
            if ($node.primaryAxisAlignItems -eq "CENTER") {
                $styleAttrs += "justify-content: center"
            }
        }
        
        # Background color
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
        
        if ($node.absoluteBoundingBox) {
            $width = $node.absoluteBoundingBox.width
            $height = $node.absoluteBoundingBox.height
            $styleAttrs += "width: ${width}px"
            $styleAttrs += "height: ${height}px"
        }
        
        if ($node.style) {
            $fontSize = if ($node.style.fontSize) { "$($node.style.fontSize)px" } else { "16px" }
            $fontFamily = if ($node.style.fontFamily) { $node.style.fontFamily } else { "sans-serif" }
            $fontWeight = if ($node.style.fontWeight) { $node.style.fontWeight } else { "400" }
            $lineHeight = if ($node.style.lineHeightPx) { "$($node.style.lineHeightPx)px" } else { "normal" }
            $letterSpacing = if ($node.style.letterSpacing) { "$($node.style.letterSpacing)px" } else { "normal" }
            
            $styleAttrs += "font-size: $fontSize"
            $styleAttrs += "font-family: '$fontFamily', sans-serif"
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
        
        $tag = "p"
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

# Create full HTML document
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

# Save HTML
$htmlPath = Join-Path (Split-Path $PSScriptRoot -Parent) "index.html"
$fullHTML | Out-File -FilePath $htmlPath -Encoding UTF8

Write-Host "  HTML updated: index.html" -ForegroundColor Green
Write-Host ""

# Step 3: Auto-update site on GitHub Pages
Write-Host "Step 3: Updating site on GitHub Pages..." -ForegroundColor Yellow

$projectRoot = Split-Path $PSScriptRoot -Parent
Set-Location $projectRoot

# Check if git is available
$gitPath = (Get-Command git -ErrorAction SilentlyContinue).Source
if (-not $gitPath) {
    Write-Host "  Warning: Git not found. Skipping GitHub Pages update." -ForegroundColor Yellow
    Write-Host "  Run manually: git add . && git commit -m 'Update from Figma' && git push origin main" -ForegroundColor Cyan
} else {
    Write-Host "  Adding changes to git..." -ForegroundColor Cyan
    & $gitPath add . 2>&1 | Out-Null
    
    Write-Host "  Creating commit..." -ForegroundColor Cyan
    $commitMsg = "Update from Figma - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    $commitResult = & $gitPath commit -m $commitMsg 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Pushing to GitHub..." -ForegroundColor Cyan
        $pushResult = & $gitPath push origin main 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  Site update pushed to GitHub!" -ForegroundColor Green
            Write-Host "  Site will update in 1-2 minutes at:" -ForegroundColor Cyan
            Write-Host "  https://Logos-big.github.io/cp-portfolio-calipso-design/" -ForegroundColor White
        } else {
            Write-Host "  Warning: git push failed" -ForegroundColor Yellow
            Write-Host "  Run manually: git push origin main" -ForegroundColor Cyan
        }
    } else {
        # Check if there were no changes
        if ($commitResult -match "nothing to commit") {
            Write-Host "  No changes to commit" -ForegroundColor Yellow
        } else {
            Write-Host "  Warning: git commit failed" -ForegroundColor Yellow
            Write-Host "  Run manually: git commit -m 'Update from Figma' && git push origin main" -ForegroundColor Cyan
        }
    }
}

Write-Host ""
Write-Host "=== Done! Page updated from Figma ===" -ForegroundColor Green
