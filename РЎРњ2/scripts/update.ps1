# Figma to HTML - STRICT DESIGN SYSTEM COMPLIANCE
# ONE REQUEST ONLY - NO CACHE - NO GIT - STRICTLY FOLLOW FIGMA DESIGN
# This script generates HTML EXACTLY as in Figma design - NO EXTRAS, NO MODIFICATIONS
# Usage: .\scripts\update.ps1

$ErrorActionPreference = "Stop"

$configPath = Join-Path $PSScriptRoot "figma-config.json"
$dataPath = Join-Path (Split-Path $PSScriptRoot -Parent) "figma-data.json"
$cssPath = Join-Path (Split-Path $PSScriptRoot -Parent) "styles\figma-variables.css"
$htmlPath = Join-Path (Split-Path $PSScriptRoot -Parent) "index.html"

Write-Host "=== Figma Update (STRICT MODE - ONE REQUEST ONLY) ===" -ForegroundColor Green
Write-Host "Generating EXACTLY as in Figma design - STRICTLY following design system" -ForegroundColor Cyan
Write-Host "ONE REQUEST - NO CACHE - NO GIT - FRESH DATA FROM FIGMA" -ForegroundColor Yellow
Write-Host ""

# Load config
if (-not (Test-Path $configPath)) {
    $errorMsg = "ERROR: Config file not found: $configPath"
    Write-Host $errorMsg -ForegroundColor Red
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.MessageBox]::Show($errorMsg, "Figma Update Error", "OK", "Error")
    exit 1
}

try {
    $config = Get-Content $configPath -Raw -Encoding UTF8 | ConvertFrom-Json
} catch {
    $errorMsg = "ERROR: Invalid JSON in config file: $configPath"
    Write-Host $errorMsg -ForegroundColor Red
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.MessageBox]::Show($errorMsg, "Figma Update Error", "OK", "Error")
    exit 1
}

$fileKey = $config.fileKey
$token = $config.token

if (-not $fileKey -or $fileKey -eq "") {
    $errorMsg = "ERROR: fileKey is not set in $configPath"
    Write-Host $errorMsg -ForegroundColor Red
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.MessageBox]::Show($errorMsg, "Figma Update Error", "OK", "Error")
    exit 1
}

if (-not $token -or $token -eq "") {
    $errorMsg = "ERROR: token is not set in $configPath"
    Write-Host $errorMsg -ForegroundColor Red
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.MessageBox]::Show($errorMsg, "Figma Update Error", "OK", "Error")
    exit 1
}

# Step 1: Fetch ENTIRE file from Figma - STRICTLY ONE REQUEST ONLY with auto-retry
Write-Host "Step 1: Fetching ENTIRE file from Figma (ONE REQUEST - NO CACHE)..." -ForegroundColor Yellow

# Track last request time to avoid rate limits
$lastRequestFile = Join-Path $PSScriptRoot "last-request-time.txt"
$minRequestInterval = 3 # Minimum seconds between requests to avoid rate limit

# Check last request time
if (Test-Path $lastRequestFile) {
    try {
        $lastRequestTime = [DateTime]::Parse((Get-Content $lastRequestFile -Raw).Trim())
        $timeSinceLastRequest = (Get-Date) - $lastRequestTime
        if ($timeSinceLastRequest.TotalSeconds -lt $minRequestInterval) {
            $waitTime = [math]::Ceiling($minRequestInterval - $timeSinceLastRequest.TotalSeconds)
            Write-Host "  Waiting $waitTime seconds to avoid rate limit..." -ForegroundColor Yellow
            Start-Sleep -Seconds $waitTime
        }
    } catch {
        # Ignore errors reading last request time
    }
}

# Use /files/{file_key} endpoint - ONE REQUEST for entire file structure
$url = "https://api.figma.com/v1/files/$fileKey"
$headers = @{ "X-Figma-Token" = $token }

# Auto-retry function for 429 errors
$maxRetries = 3
$retryCount = 0
$success = $false

while (-not $success -and $retryCount -lt $maxRetries) {
    try {
        Write-Host "  Connecting to Figma API (ONE REQUEST for entire file)..." -ForegroundColor Cyan
        $response = Invoke-RestMethod -Uri $url -Method Get -Headers $headers -ErrorAction Stop
        
        # Save request time
        (Get-Date).ToString("o") | Out-File -FilePath $lastRequestFile -Encoding UTF8 -Force
        
        $response | ConvertTo-Json -Depth 100 | Out-File -FilePath $dataPath -Encoding UTF8 -Force
        Write-Host "  [OK] Entire file received and saved (ONE REQUEST)" -ForegroundColor Green
        $success = $true
    } catch {
        $errorDetails = $_.Exception.Message
        $statusCode = $null
        
        # Try to get status code from response
        if ($_.Exception.Response) {
            try {
                $statusCode = [int]$_.Exception.Response.StatusCode.value__
            } catch {
                # Status code not available
            }
        }
        
        # Handle 429 Rate Limit - AUTO RETRY with wait
        if ($statusCode -eq 429) {
            $retryCount++
            if ($retryCount -lt $maxRetries) {
                $waitTime = 120 # Wait 2 minutes for rate limit
                Write-Host "  [WARNING] Rate limit exceeded (429) - waiting $waitTime seconds and retrying..." -ForegroundColor Yellow
                Write-Host "  Attempt $retryCount of $maxRetries" -ForegroundColor Yellow
                Start-Sleep -Seconds $waitTime
                continue # Retry
            } else {
                $errorMsg = "FIGMA RATE LIMIT EXCEEDED (429)`n`nAfter $maxRetries attempts, rate limit still exceeded.`n`nPlease wait 2-3 minutes and try again."
                Write-Host "  [ERROR] Rate limit exceeded after $maxRetries attempts" -ForegroundColor Red
                Add-Type -AssemblyName System.Windows.Forms
                [System.Windows.Forms.MessageBox]::Show($errorMsg, "Figma Update Error", "OK", "Error")
                exit 1
            }
        }
        # Handle other errors
        elseif ($statusCode -eq 401) {
            $errorMsg = "FIGMA AUTHENTICATION ERROR (401)`n`nInvalid or expired token.`n`nPlease check your token in scripts/figma-config.json"
            Write-Host "  [ERROR] Authentication failed (401)" -ForegroundColor Red
            Add-Type -AssemblyName System.Windows.Forms
            [System.Windows.Forms.MessageBox]::Show($errorMsg, "Figma Update Error", "OK", "Error")
            exit 1
        }
        elseif ($statusCode -eq 404) {
            $errorMsg = "FIGMA FILE NOT FOUND (404)`n`nFile Key is incorrect or file is not accessible.`n`nPlease check scripts/figma-config.json"
            Write-Host "  [ERROR] File not found (404)" -ForegroundColor Red
            Add-Type -AssemblyName System.Windows.Forms
            [System.Windows.Forms.MessageBox]::Show($errorMsg, "Figma Update Error", "OK", "Error")
            exit 1
        }
        else {
            $errorMsg = "FIGMA API ERROR`n`n$errorDetails`n`nCannot fetch data from Figma.`n`nCheck your internet connection and try again."
            Write-Host "  [ERROR] $errorDetails" -ForegroundColor Red
            Add-Type -AssemblyName System.Windows.Forms
            [System.Windows.Forms.MessageBox]::Show($errorMsg, "Figma Update Error", "OK", "Error")
            exit 1
        }
    }
}

# Step 2: Generate CSS variables - STRICTLY from Figma design system
Write-Host "Step 2: Generating CSS variables (STRICT DESIGN SYSTEM)..." -ForegroundColor Yellow

try {
    $data = Get-Content $dataPath -Raw -Encoding UTF8 | ConvertFrom-Json
} catch {
    $errorMsg = "ERROR: Failed to parse Figma data JSON"
    Write-Host $errorMsg -ForegroundColor Red
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.MessageBox]::Show($errorMsg, "Figma Update Error", "OK", "Error")
    exit 1
}

$colors = @{}
$typography = @{}

function Extract-DesignTokens {
    param($node)
    
    if (-not $node) { return }
    
    # Colors from fills - STRICTLY from Figma
    if ($node.fills -and $node.fills.Count -gt 0) {
        foreach ($fill in $node.fills) {
            if ($fill.type -eq "SOLID" -and $fill.color) {
                $c = $fill.color
                $r = [math]::Round($c.r * 255)
                $g = [math]::Round($c.g * 255)
                $b = [math]::Round($c.b * 255)
                $a = if ($c.a) { [math]::Round($c.a, 2) } else { 1 }
                $hex = "#" + ([Convert]::ToString($r, 16).PadLeft(2, '0')) + ([Convert]::ToString($g, 16).PadLeft(2, '0')) + ([Convert]::ToString($b, 16).PadLeft(2, '0'))
                if ($a -lt 1) {
                    $hex += ([Convert]::ToString([math]::Round($a * 255), 16).PadLeft(2, '0'))
                }
                $name = if ($node.name) { $node.name } else { "unnamed" }
                if (-not $colors.ContainsKey($name)) {
                    $colors[$name] = $hex
                }
            }
        }
    }
    
    # Background colors - STRICTLY from Figma
    if ($node.backgroundColor) {
        $c = $node.backgroundColor
        if ($c.a -gt 0) {
            $r = [math]::Round($c.r * 255)
            $g = [math]::Round($c.g * 255)
            $b = [math]::Round($c.b * 255)
            $a = if ($c.a) { [math]::Round($c.a, 2) } else { 1 }
            $hex = "#" + ([Convert]::ToString($r, 16).PadLeft(2, '0')) + ([Convert]::ToString($g, 16).PadLeft(2, '0')) + ([Convert]::ToString($b, 16).PadLeft(2, '0'))
            if ($a -lt 1) {
                $hex += ([Convert]::ToString([math]::Round($a * 255), 16).PadLeft(2, '0'))
            }
            $name = if ($node.name) { $node.name + "-bg" } else { "background" }
            if (-not $colors.ContainsKey($name)) {
                $colors[$name] = $hex
            }
        }
    }
    
    # Background from background array - STRICTLY from Figma
    if ($node.background -and $node.background.Count -gt 0) {
        foreach ($bg in $node.background) {
            if ($bg.type -eq "SOLID" -and $bg.color) {
                $c = $bg.color
                if ($c.a -gt 0) {
                    $r = [math]::Round($c.r * 255)
                    $g = [math]::Round($c.g * 255)
                    $b = [math]::Round($c.b * 255)
                    $a = if ($c.a) { [math]::Round($c.a, 2) } else { 1 }
                    $hex = "#" + ([Convert]::ToString($r, 16).PadLeft(2, '0')) + ([Convert]::ToString($g, 16).PadLeft(2, '0')) + ([Convert]::ToString($b, 16).PadLeft(2, '0'))
                    if ($a -lt 1) {
                        $hex += ([Convert]::ToString([math]::Round($a * 255), 16).PadLeft(2, '0'))
                    }
                    $name = if ($node.name) { $node.name + "-bg" } else { "background" }
                    if (-not $colors.ContainsKey($name)) {
                        $colors[$name] = $hex
                    }
                }
            }
        }
    }
    
    # Typography - STRICTLY from Figma
    if ($node.type -eq "TEXT" -and $node.style) {
        $name = if ($node.name) { $node.name } else { "text" }
        if (-not $typography.ContainsKey($name)) {
            $typography[$name] = @{
                fontFamily = if ($node.style.fontFamily) { $node.style.fontFamily } else { "sans-serif" }
                fontSize = if ($node.style.fontSize) { $node.style.fontSize } else { 16 }
                fontWeight = if ($node.style.fontWeight) { $node.style.fontWeight } else { 400 }
                lineHeight = if ($node.style.lineHeightPx) { $node.style.lineHeightPx } else { if ($node.style.fontSize) { $node.style.fontSize * 1.2 } else { 19.2 } }
                letterSpacing = if ($node.style.letterSpacing) { $node.style.letterSpacing } else { 0 }
            }
        }
    }
    
    # Recursively process children
    if ($node.children -and $node.children.Count -gt 0) {
        foreach ($child in $node.children) {
            Extract-DesignTokens -node $child
        }
    }
}

# Extract design tokens from entire file structure
if ($data.document) {
    Extract-DesignTokens -node $data.document
} else {
    $errorMsg = "ERROR: No document found in Figma response"
    Write-Host $errorMsg -ForegroundColor Red
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.MessageBox]::Show($errorMsg, "Figma Update Error", "OK", "Error")
    exit 1
}

# Generate CSS - STRICTLY from design system
$css = ":root {`n"
foreach ($name in ($colors.Keys | Sort-Object)) {
    $varName = "--color-" + ($name -replace '[^a-zA-Z0-9]', '-').ToLower()
    $css += "  $varName : $($colors[$name]);`n"
}
foreach ($name in ($typography.Keys | Sort-Object)) {
    $varName = "--font-" + ($name -replace '[^a-zA-Z0-9]', '-').ToLower()
    $css += "  $varName-family : '$($typography[$name].fontFamily)', sans-serif;`n"
    $css += "  $varName-size : $($typography[$name].fontSize)px;`n"
    $css += "  $varName-weight : $($typography[$name].fontWeight);`n"
    $css += "  $varName-line-height : $($typography[$name].lineHeight)px;`n"
    $css += "  $varName-letter-spacing : $($typography[$name].letterSpacing)px;`n"
}
$css += "}`n"

$stylesDir = Split-Path $cssPath -Parent
if (-not (Test-Path $stylesDir)) {
    New-Item -ItemType Directory -Path $stylesDir -Force | Out-Null
}
$css | Out-File -FilePath $cssPath -Encoding UTF8 -Force
Write-Host "  [OK] CSS variables saved (STRICT DESIGN SYSTEM)" -ForegroundColor Green

# Step 3: Generate HTML - STRICTLY from Figma, NO EXTRAS
Write-Host "Step 3: Generating HTML (STRICT MODE - EXACTLY AS IN FIGMA)..." -ForegroundColor Yellow

function Find-MainNode {
    param($node)
    
    if (-not $node) { return $null }
    
    # Check current node - STRICTLY match "Main" frame
    if ($node.name -and $node.name -eq "Main" -and $node.type -eq "FRAME") {
        return $node
    }
    
    # Recursively search in children
    if ($node.children -and $node.children.Count -gt 0) {
        foreach ($child in $node.children) {
            $found = Find-MainNode -node $child
            if ($found) {
                return $found
            }
        }
    }
    
    return $null
}

# Search for Main frame in entire file structure
$mainNode = $null
if ($data.document) {
    $mainNode = Find-MainNode -node $data.document
}

if (-not $mainNode) {
    $errorMsg = "ERROR: Main frame not found in Figma file`n`nMake sure the frame with name 'Main' and type 'FRAME' exists in your Figma file."
    Write-Host $errorMsg -ForegroundColor Red
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.MessageBox]::Show($errorMsg, "Figma Update Error", "OK", "Error")
    exit 1
}

$mainWidth = if ($mainNode.absoluteBoundingBox -and $mainNode.absoluteBoundingBox.width) { [math]::Round($mainNode.absoluteBoundingBox.width, 1) } else { "?" }
$mainHeight = if ($mainNode.absoluteBoundingBox -and $mainNode.absoluteBoundingBox.height) { [math]::Round($mainNode.absoluteBoundingBox.height, 1) } else { "?" }
Write-Host "  [OK] Found Main frame: ${mainWidth}x${mainHeight}px" -ForegroundColor Cyan

# Helper function to convert color to hex - STRICTLY from Figma
function Convert-ColorToHex {
    param($color, $alpha = $null)
    
    if (-not $color) { return $null }
    
    $r = [math]::Round($color.r * 255)
    $g = [math]::Round($color.g * 255)
    $b = [math]::Round($color.b * 255)
    $hex = "#" + ([Convert]::ToString($r, 16).PadLeft(2, '0')) + ([Convert]::ToString($g, 16).PadLeft(2, '0')) + ([Convert]::ToString($b, 16).PadLeft(2, '0'))
    
    $a = if ($alpha -ne $null) { $alpha } elseif ($color.a) { $color.a } else { 1 }
    if ($a -lt 1) {
        $hex += ([Convert]::ToString([math]::Round($a * 255), 16).PadLeft(2, '0'))
    }
    
    return $hex
}

# Generate HTML - ONLY what exists in Figma, nothing else - STRICT DESIGN SYSTEM
function Generate-HTML {
    param($node, $level = 0)
    
    if (-not $node) { return "" }
    
    $html = ""
    $indent = "    " * $level
    
    if ($node.type -eq "FRAME" -or $node.type -eq "GROUP" -or $node.type -eq "COMPONENT" -or $node.type -eq "INSTANCE") {
        $className = if ($node.name) { ($node.name -replace '[^a-zA-Z0-9]', '-').ToLower() } else { "unnamed" }
        $styleAttrs = @()
        
        # Dimensions - STRICTLY from Figma
        if ($node.absoluteBoundingBox) {
            $w = [math]::Round($node.absoluteBoundingBox.width, 1)
            $h = [math]::Round($node.absoluteBoundingBox.height, 1)
            $styleAttrs += "width: ${w}px"
            $styleAttrs += "height: ${h}px"
        }
        
        # Layout - STRICTLY from Figma Auto Layout
        if ($node.layoutMode) {
            if ($node.layoutMode -eq "HORIZONTAL") {
                $styleAttrs += "display: flex"
                $styleAttrs += "flex-direction: row"
            } elseif ($node.layoutMode -eq "VERTICAL") {
                $styleAttrs += "display: flex"
                $styleAttrs += "flex-direction: column"
            }
        } elseif ($node.type -eq "FRAME" -or $node.type -eq "GROUP") {
            # Default to flex column for frames without explicit layout
            $styleAttrs += "display: flex"
            $styleAttrs += "flex-direction: column"
        }
        
        # Padding - STRICTLY from Figma
        if ($node.paddingLeft) { $styleAttrs += "padding-left: $([math]::Round($node.paddingLeft, 1))px" }
        if ($node.paddingRight) { $styleAttrs += "padding-right: $([math]::Round($node.paddingRight, 1))px" }
        if ($node.paddingTop) { $styleAttrs += "padding-top: $([math]::Round($node.paddingTop, 1))px" }
        if ($node.paddingBottom) { $styleAttrs += "padding-bottom: $([math]::Round($node.paddingBottom, 1))px" }
        
        # Gap/Spacing - STRICTLY from Figma
        if ($node.itemSpacing) { $styleAttrs += "gap: $([math]::Round($node.itemSpacing, 1))px" }
        
        # Alignment - STRICTLY from Figma
        if ($node.counterAxisAlignItems) {
            if ($node.counterAxisAlignItems -eq "CENTER") { $styleAttrs += "align-items: center" }
            elseif ($node.counterAxisAlignItems -eq "MIN") { $styleAttrs += "align-items: flex-start" }
            elseif ($node.counterAxisAlignItems -eq "MAX") { $styleAttrs += "align-items: flex-end" }
            elseif ($node.counterAxisAlignItems -eq "STRETCH") { $styleAttrs += "align-items: stretch" }
        }
        
        if ($node.primaryAxisAlignItems) {
            if ($node.primaryAxisAlignItems -eq "CENTER") { $styleAttrs += "justify-content: center" }
            elseif ($node.primaryAxisAlignItems -eq "MIN") { $styleAttrs += "justify-content: flex-start" }
            elseif ($node.primaryAxisAlignItems -eq "MAX") { $styleAttrs += "justify-content: flex-end" }
            elseif ($node.primaryAxisAlignItems -eq "SPACE_BETWEEN") { $styleAttrs += "justify-content: space-between" }
        }
        
        # Background color - STRICTLY from Figma, only if not transparent
        $bgColor = $null
        if ($node.backgroundColor) {
            $bgColor = Convert-ColorToHex -color $node.backgroundColor
        } elseif ($node.background -and $node.background.Count -gt 0) {
            $bg = $node.background[0]
            if ($bg.type -eq "SOLID" -and $bg.color) {
                $bgColor = Convert-ColorToHex -color $bg.color
            }
        }
        
        if ($bgColor) {
            $styleAttrs += "background-color: $bgColor"
        }
        
        $style = if ($styleAttrs.Count -gt 0) { " style='" + ($styleAttrs -join "; ") + "'" } else { "" }
        $html += "$indent<div class='$className'$style>`n"
        
        # Children - STRICTLY from Figma, in exact order
        if ($node.children -and $node.children.Count -gt 0) {
            foreach ($child in $node.children) {
                $html += Generate-HTML -node $child -level ($level + 1)
            }
        }
        
        $html += "$indent</div>`n"
    }
    elseif ($node.type -eq "TEXT") {
        $className = if ($node.name) { ($node.name -replace '[^a-zA-Z0-9]', '-').ToLower() } else { "text" }
        $text = if ($node.characters) { $node.characters } else { "" }
        $styleAttrs = @()
        
        # Dimensions - STRICTLY from Figma
        if ($node.absoluteBoundingBox) {
            $w = [math]::Round($node.absoluteBoundingBox.width, 1)
            $h = [math]::Round($node.absoluteBoundingBox.height, 1)
            $styleAttrs += "width: ${w}px"
            $styleAttrs += "height: ${h}px"
        }
        
        # Typography - STRICTLY from Figma design system
        if ($node.style) {
            if ($node.style.fontSize) { $styleAttrs += "font-size: $([math]::Round($node.style.fontSize, 1))px" }
            if ($node.style.fontFamily) { $styleAttrs += "font-family: $($node.style.fontFamily), sans-serif" }
            if ($node.style.fontWeight) { $styleAttrs += "font-weight: $($node.style.fontWeight)" }
            if ($node.style.lineHeightPx) { $styleAttrs += "line-height: $([math]::Round($node.style.lineHeightPx, 1))px" }
            if ($node.style.letterSpacing) { $styleAttrs += "letter-spacing: $([math]::Round($node.style.letterSpacing, 2))px" }
            if ($node.style.textAlignHorizontal) {
                $align = $node.style.textAlignHorizontal.ToLower()
                if ($align -eq "left") { $styleAttrs += "text-align: left" }
                elseif ($align -eq "center") { $styleAttrs += "text-align: center" }
                elseif ($align -eq "right") { $styleAttrs += "text-align: right" }
                elseif ($align -eq "justified") { $styleAttrs += "text-align: justify" }
            }
        }
        
        # Text color - STRICTLY from Figma
        $textColor = $null
        if ($node.fills -and $node.fills.Count -gt 0) {
            $fill = $node.fills[0]
            if ($fill.type -eq "SOLID" -and $fill.color) {
                $textColor = Convert-ColorToHex -color $fill.color
            }
        }
        
        if ($textColor) {
            $styleAttrs += "color: $textColor"
        }
        
        $style = if ($styleAttrs.Count -gt 0) { " style='" + ($styleAttrs -join "; ") + "'" } else { "" }
        $html += "$indent<p class='$className'$style>$text</p>`n"
    }
    elseif ($node.type -eq "RECTANGLE" -or $node.type -eq "ELLIPSE" -or $node.type -eq "VECTOR") {
        # Render shapes as divs - STRICTLY from Figma
        $className = if ($node.name) { ($node.name -replace '[^a-zA-Z0-9]', '-').ToLower() } else { "shape" }
        $styleAttrs = @()
        
        if ($node.absoluteBoundingBox) {
            $w = [math]::Round($node.absoluteBoundingBox.width, 1)
            $h = [math]::Round($node.absoluteBoundingBox.height, 1)
            $styleAttrs += "width: ${w}px"
            $styleAttrs += "height: ${h}px"
        }
        
        # Background/fill - STRICTLY from Figma
        $fillColor = $null
        if ($node.fills -and $node.fills.Count -gt 0) {
            $fill = $node.fills[0]
            if ($fill.type -eq "SOLID" -and $fill.color) {
                $fillColor = Convert-ColorToHex -color $fill.color
            }
        }
        
        if ($fillColor) {
            $styleAttrs += "background-color: $fillColor"
        }
        
        $style = if ($styleAttrs.Count -gt 0) { " style='" + ($styleAttrs -join "; ") + "'" } else { "" }
        $html += "$indent<div class='$className'$style></div>`n"
    }
    
    return $html
}

$htmlContent = Generate-HTML -node $mainNode

# Create full HTML document - STRICTLY following structure
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

$fullHTML | Out-File -FilePath $htmlPath -Encoding UTF8 -Force
Write-Host "  [OK] HTML saved (STRICT DESIGN SYSTEM - EXACTLY AS IN FIGMA)" -ForegroundColor Green

Write-Host ""
Write-Host "=== Done! Files updated LOCALLY (NO GIT) ===" -ForegroundColor Green
Write-Host ""
Write-Host "Updated files:" -ForegroundColor Cyan
Write-Host "  [OK] figma-data.json (ENTIRE FILE - ONE REQUEST)" -ForegroundColor White
Write-Host "  [OK] styles/figma-variables.css (STRICT DESIGN SYSTEM)" -ForegroundColor White
Write-Host "  [OK] index.html (EXACTLY AS IN FIGMA)" -ForegroundColor White
Write-Host ""
Write-Host "ONE API REQUEST ONLY - NO GIT OPERATIONS - LOCAL UPDATE ONLY" -ForegroundColor Yellow
Write-Host "STRICTLY FOLLOWING FIGMA DESIGN SYSTEM - NO EXTRAS" -ForegroundColor Yellow
