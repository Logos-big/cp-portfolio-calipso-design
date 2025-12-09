# Figma to HTML - STRICT DESIGN SYSTEM COMPLIANCE
# This script generates HTML EXACTLY as in Figma design - NO EXTRAS, NO MODIFICATIONS
# Usage: .\scripts\update.ps1

$configPath = Join-Path $PSScriptRoot "figma-config.json"
$dataPath = Join-Path (Split-Path $PSScriptRoot -Parent) "figma-data.json"
$cssPath = Join-Path (Split-Path $PSScriptRoot -Parent) "styles\figma-variables.css"
$htmlPath = Join-Path (Split-Path $PSScriptRoot -Parent) "index.html"

Write-Host "=== Update from Figma (STRICT MODE) ===" -ForegroundColor Green
Write-Host "Generating EXACTLY as in Figma design - no extras" -ForegroundColor Cyan
Write-Host ""

# Load config
if (-not (Test-Path $configPath)) {
    Write-Host "Error: Config file not found: $configPath" -ForegroundColor Red
    exit 1
}

$config = Get-Content $configPath | ConvertFrom-Json
$fileKey = $config.fileKey
$token = $config.token
$nodeIds = $config.nodeIds

if (-not $fileKey -or -not $token) {
    Write-Host "Error: Set fileKey and token in $configPath" -ForegroundColor Red
    exit 1
}

if (-not $nodeIds -or $nodeIds.Count -eq 0) {
    $nodeIds = @("67:5539")
}

# Step 1: Fetch data from Figma
Write-Host "Step 1: Fetching data from Figma..." -ForegroundColor Yellow

$nodeIdsForUrl = $nodeIds | ForEach-Object { $_ -replace ":", "-" }
$nodesParam = $nodeIdsForUrl -join ","
$url = "https://api.figma.com/v1/files/$fileKey/nodes?ids=$nodesParam"
$headers = @{ "X-Figma-Token" = $token }

try {
    Write-Host "  Connecting to Figma API..." -ForegroundColor Cyan
    $response = Invoke-RestMethod -Uri $url -Method Get -Headers $headers
    $response | ConvertTo-Json -Depth 100 | Out-File -FilePath $dataPath -Encoding UTF8
    Write-Host "  Data saved" -ForegroundColor Green
} catch {
    if ($_.Exception.Message -match "429") {
        Write-Host "  Rate limit (429) - using cached data" -ForegroundColor Yellow
        if (-not (Test-Path $dataPath)) {
            Write-Host "  Error: No cached data" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "  Error: $_" -ForegroundColor Red
        if (-not (Test-Path $dataPath)) { exit 1 }
    }
}

# Step 2: Generate CSS variables
Write-Host "Step 2: Generating CSS variables..." -ForegroundColor Yellow

$data = Get-Content $dataPath -Raw | ConvertFrom-Json
$colors = @{}
$typography = @{}

function Extract-DesignTokens {
    param($node)
    
    # Colors
    if ($node.fills -and $node.fills.Count -gt 0 -and $node.fills[0].type -eq "SOLID") {
        $c = $node.fills[0].color
        $r = [math]::Round($c.r * 255)
        $g = [math]::Round($c.g * 255)
        $b = [math]::Round($c.b * 255)
        $hex = "#" + ([Convert]::ToString($r, 16).PadLeft(2, '0')) + ([Convert]::ToString($g, 16).PadLeft(2, '0')) + ([Convert]::ToString($b, 16).PadLeft(2, '0'))
        $name = if ($node.name) { $node.name } else { "unnamed" }
        $colors[$name] = $hex
    }
    
    # Background colors
    if ($node.backgroundColor) {
        $c = $node.backgroundColor
        $r = [math]::Round($c.r * 255)
        $g = [math]::Round($c.g * 255)
        $b = [math]::Round($c.b * 255)
        $hex = "#" + ([Convert]::ToString($r, 16).PadLeft(2, '0')) + ([Convert]::ToString($g, 16).PadLeft(2, '0')) + ([Convert]::ToString($b, 16).PadLeft(2, '0'))
        $name = if ($node.name) { $node.name } else { "background" }
        $colors[$name] = $hex
    }
    
    # Typography
    if ($node.type -eq "TEXT" -and $node.style) {
        $name = if ($node.name) { $node.name } else { "text" }
        $typography[$name] = @{
            fontFamily = $node.style.fontFamily
            fontSize = $node.style.fontSize
            fontWeight = $node.style.fontWeight
        }
    }
    
    if ($node.children) {
        foreach ($child in $node.children) {
            Extract-DesignTokens -node $child
        }
    }
}

if ($data.nodes) {
    foreach ($nodeKey in $data.nodes.PSObject.Properties.Name) {
        Extract-DesignTokens -node $data.nodes.$nodeKey.document
    }
}

# Generate CSS
$css = ":root {`n"
foreach ($name in $colors.Keys) {
    $varName = "--color-" + ($name -replace '[^a-zA-Z0-9]', '-').ToLower()
    $css += "  $varName : $($colors[$name]);`n"
}
foreach ($name in $typography.Keys) {
    $varName = "--font-" + ($name -replace '[^a-zA-Z0-9]', '-').ToLower()
    $css += "  $varName-family : '$($typography[$name].fontFamily)', sans-serif;`n"
    $css += "  $varName-size : $($typography[$name].fontSize)px;`n"
    $css += "  $varName-weight : $($typography[$name].fontWeight);`n"
}
$css += "}`n"

$stylesDir = Split-Path $cssPath -Parent
if (-not (Test-Path $stylesDir)) {
    New-Item -ItemType Directory -Path $stylesDir | Out-Null
}
$css | Out-File -FilePath $cssPath -Encoding UTF8
Write-Host "  CSS variables saved" -ForegroundColor Green

# Step 3: Generate HTML - STRICTLY from Figma
Write-Host "Step 3: Generating HTML (STRICT MODE)..." -ForegroundColor Yellow

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

Write-Host "  Found Main frame: $($mainNode.absoluteBoundingBox.width)x$($mainNode.absoluteBoundingBox.height)px" -ForegroundColor Cyan

# Generate HTML - ONLY what exists in Figma, nothing else
function Generate-HTML {
    param($node, $level = 0)
    
    $html = ""
    $indent = "    " * $level
    
    if ($node.type -eq "FRAME" -or $node.type -eq "GROUP") {
        $className = ($node.name -replace '[^a-zA-Z0-9]', '-').ToLower()
        $styleAttrs = @()
        
        if ($node.absoluteBoundingBox) {
            $styleAttrs += "width: $($node.absoluteBoundingBox.width).0px"
            $styleAttrs += "height: $($node.absoluteBoundingBox.height).0px"
        }
        
        if ($node.layoutMode -eq "HORIZONTAL") {
            $styleAttrs += "display: flex"
            $styleAttrs += "flex-direction: row"
        } elseif ($node.layoutMode -eq "VERTICAL") {
            $styleAttrs += "display: flex"
            $styleAttrs += "flex-direction: column"
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
                $html += Generate-HTML -node $child -level ($level + 1)
            }
        }
        
        $html += "$indent</div>`n"
    }
    elseif ($node.type -eq "TEXT") {
        $className = ($node.name -replace '[^a-zA-Z0-9]', '-').ToLower()
        $text = if ($node.characters) { $node.characters } else { "" }
        $styleAttrs = @()
        
        if ($node.absoluteBoundingBox) {
            $styleAttrs += "width: $($node.absoluteBoundingBox.width).0px"
            $styleAttrs += "height: $($node.absoluteBoundingBox.height).0px"
        }
        
        if ($node.style) {
            $styleAttrs += "font-size: $($node.style.fontSize).0px"
            $styleAttrs += "font-family: $($node.style.fontFamily), sans-serif"
            $styleAttrs += "font-weight: $($node.style.fontWeight)"
            $styleAttrs += "line-height: $($node.style.lineHeightPx).0px"
            $styleAttrs += "letter-spacing: $($node.style.letterSpacing).0px"
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

$htmlContent = Generate-HTML -node $mainNode

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

$fullHTML | Out-File -FilePath $htmlPath -Encoding UTF8
Write-Host "  HTML saved" -ForegroundColor Green

# Step 4: Git update (optional)
Write-Host "Step 4: Updating GitHub..." -ForegroundColor Yellow

$projectRoot = Split-Path $PSScriptRoot -Parent
Set-Location $projectRoot

$gitPath = (Get-Command git -ErrorAction SilentlyContinue).Source
if ($gitPath) {
    & $gitPath add . 2>&1 | Out-Null
    $commitMsg = "Update from Figma - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    $commitResult = & $gitPath commit -m $commitMsg 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        & $gitPath push origin main 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  Pushed to GitHub" -ForegroundColor Green
        }
    }
}

Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Green

