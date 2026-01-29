###############################################################################
# K IMPERIA — IPFS Deployment Script (PowerShell)
# Windows-compatible one-command deployment to IPFS
###############################################################################

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "  K IMPERIA — IPFS Deployment" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host ""

function Test-IpfsHttpApi {
    param(
        [string]$ApiBase = "http://127.0.0.1:5001"
    )
    try {
        $null = & curl.exe -s -X POST "$ApiBase/api/v0/version" 2>$null
        return $true
    } catch {
        return $false
    }
}

$HasIpfsCli = $false
try {
    $null = Get-Command ipfs -ErrorAction Stop
    $HasIpfsCli = $true
} catch {
    $HasIpfsCli = $false
}

# If CLI isn't available, use IPFS Desktop (HTTP API)
$IpfsApiBase = "http://127.0.0.1:5001"
$UseHttpApi = -not $HasIpfsCli

if ($UseHttpApi) {
    try {
        $null = Get-Command curl.exe -ErrorAction Stop
    } catch {
        Write-Host "❌ curl.exe not found (required for IPFS HTTP API upload)" -ForegroundColor Red
        Write-Host "Windows normally includes curl.exe. If missing, install Git for Windows or update Windows." -ForegroundColor Yellow
        exit 1
    }

    if (-not (Test-IpfsHttpApi -ApiBase $IpfsApiBase)) {
        Write-Host "❌ IPFS HTTP API not reachable at $IpfsApiBase" -ForegroundColor Red
        Write-Host "Open IPFS Desktop and ensure Kubo is running. Expected API: http://127.0.0.1:5001" -ForegroundColor Yellow
        exit 1
    }

    Write-Host "✅ Using IPFS Desktop HTTP API ($IpfsApiBase)" -ForegroundColor Green
} else {
    # Check if IPFS daemon is running (CLI mode)
    try {
        ipfs swarm peers 2>$null | Out-Null
    } catch {
        Write-Host "⚠️  IPFS daemon not running" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Starting IPFS daemon in background..."
        Start-Process ipfs -ArgumentList "daemon" -WindowStyle Hidden
        Write-Host "Waiting for daemon to initialize..."
        Start-Sleep -Seconds 5
    }
}

# Create deployment directory (frontend only)
$DeployDir = "ipfs-deploy"
if (Test-Path $DeployDir) {
    Remove-Item $DeployDir -Recurse -Force
}
New-Item -ItemType Directory -Path $DeployDir | Out-Null

Write-Host "📦 Preparing frontend files..." -ForegroundColor Cyan

# Copy frontend files only (no backend)
Copy-Item "index.html" "$DeployDir/"
Copy-Item "styles.css" "$DeployDir/"
Copy-Item "k-imperia.js" "$DeployDir/"
Copy-Item "admin.html" "$DeployDir/"
Copy-Item "admin.css" "$DeployDir/"
Copy-Item "admin.js" "$DeployDir/"

# Stamp Supabase Edge Functions base URL for IPFS deployment
# Expected format: https://<PROJECT_REF>.supabase.co/functions/v1
$FunctionsBase = if ($env:SUPABASE_FUNCTIONS_BASE) { $env:SUPABASE_FUNCTIONS_BASE } else { "" }

if (-not [string]::IsNullOrWhiteSpace($FunctionsBase)) {
    $functionsBaseEscaped = $FunctionsBase.Replace("'", "''")

    $intakeJs = Get-Content "$DeployDir/k-imperia.js" -Raw
    $intakeJs = $intakeJs -replace "__SUPABASE_FUNCTIONS_BASE__", $functionsBaseEscaped
    Set-Content "$DeployDir/k-imperia.js" -Value $intakeJs

    $adminJs = Get-Content "$DeployDir/admin.js" -Raw
    $adminJs = $adminJs -replace "__SUPABASE_FUNCTIONS_BASE__", $functionsBaseEscaped
    Set-Content "$DeployDir/admin.js" -Value $adminJs
} else {
    Write-Host "⚠️  SUPABASE_FUNCTIONS_BASE not set; build will use local /api/* endpoints" -ForegroundColor Yellow
}

Write-Host "🚀 Deploying to IPFS..." -ForegroundColor Cyan
Write-Host ""

if ($UseHttpApi) {
    # Add directory via HTTP API (wrap-with-directory + pin)
    $files = @(
        @{ path = "$DeployDir/index.html"; name = "index.html" },
        @{ path = "$DeployDir/styles.css"; name = "styles.css" },
        @{ path = "$DeployDir/k-imperia.js"; name = "k-imperia.js" },
        @{ path = "$DeployDir/admin.html"; name = "admin.html" },
        @{ path = "$DeployDir/admin.css"; name = "admin.css" },
        @{ path = "$DeployDir/admin.js"; name = "admin.js" }
    )

    $args = @(
        "-s",
        "-X", "POST"
    )

    foreach ($f in $files) {
        if (-not (Test-Path $f.path)) {
            Write-Host "❌ Missing file: $($f.path)" -ForegroundColor Red
            exit 1
        }
        $args += "-F"
        $args += "file=@$($f.path);filename=$DeployDir/$($f.name)"
    }

    $args += "$IpfsApiBase/api/v0/add?wrap-with-directory=true&pin=true"

    $Output = & curl.exe @args | Out-String
    $jsonLines = $Output -split "`n" | Where-Object { $_.Trim() -ne "" }
    $items = @()
    foreach ($line in $jsonLines) {
        try {
            $items += ($line | ConvertFrom-Json)
        } catch {
            # ignore non-json lines
        }
    }

    if ($items.Count -eq 0) {
        Write-Host "❌ IPFS add failed (no JSON output)." -ForegroundColor Red
        exit 1
    }

    # The directory hash is typically the last item when wrap-with-directory=true
    $CID = $items[-1].Hash
} else {
    # Add to IPFS (CLI)
    $Output = ipfs add -r $DeployDir | Out-String

    # Extract CID (last line, second column)
    $Lines = $Output -split "`n" | Where-Object { $_.Trim() -ne "" }
    $LastLine = $Lines[-1]
    $CID = ($LastLine -split "\s+")[1]

    # Pin for persistence
    ipfs pin add $CID 2>$null | Out-Null
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "  ✅ DEPLOYMENT SUCCESSFUL" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host ""
Write-Host "📍 CID: $CID" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Access via gateways:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  https://ipfs.io/ipfs/$CID/index.html" -ForegroundColor White
Write-Host "  https://ipfs.io/ipfs/$CID/admin.html" -ForegroundColor White
Write-Host "  https://gateway.pinata.cloud/ipfs/$CID/index.html" -ForegroundColor White
Write-Host "  https://cloudflare-ipfs.com/ipfs/$CID/index.html" -ForegroundColor White
Write-Host ""
Write-Host "🔗 IPFS protocol:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  ipfs://$CID/index.html" -ForegroundColor White
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1. Generate QR code using online tool or qrencode"
Write-Host "     URL: https://ipfs.io/ipfs/$CID/index.html"
Write-Host ""
Write-Host "  2. Configure DNSLink (optional):"
Write-Host "     DNS TXT record: _dnslink.genesis.unykorn.io = dnslink=/ipfs/$CID"
Write-Host ""
Write-Host "  3. Pin on pinning service (recommended):"
Write-Host "     • Pinata: https://pinata.cloud"
Write-Host "     • Web3.Storage: https://web3.storage"
Write-Host "     • Infura: https://infura.io/product/ipfs"
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host ""

# Save CID to file
Set-Content "LATEST_IPFS_CID.txt" -Value $CID
Write-Host "CID saved to: LATEST_IPFS_CID.txt" -ForegroundColor Green
Write-Host ""

# Clean up
Remove-Item $DeployDir -Recurse -Force

Write-Host "K IMPERIA Genesis Gate is live on IPFS" -ForegroundColor Green
Write-Host ""
