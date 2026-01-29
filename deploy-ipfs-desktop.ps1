###############################################################################
# K IMPERIA - IPFS Deployment Script (IPFS Desktop)
#
# Publishes the frontend (index + admin) to IPFS using IPFS Desktop's Kubo HTTP API.
# No ipfs.exe required on PATH.
#
# Prereqs:
# - IPFS Desktop running (Kubo API at http://127.0.0.1:5001)
# - curl.exe available (ships with modern Windows)
#
# Optional:
# - Set SUPABASE_FUNCTIONS_BASE to stamp Edge Function base into the JS build:
#   https://<PROJECT_REF>.supabase.co/functions/v1
###############################################################################

$ErrorActionPreference = "Stop"

$IpfsApiBase = "http://127.0.0.1:5001"
$DeployDir = Join-Path $PSScriptRoot "ipfs-deploy"

function Require-Command {
  param([string]$Name)
  try {
    $null = Get-Command $Name -ErrorAction Stop
  } catch {
    throw "Required command not found: $Name"
  }
}

function Test-IpfsApi {
  try {
    $null = & curl.exe -s -X POST "$IpfsApiBase/api/v0/version" 2>$null
    return $true
  } catch {
    return $false
  }
}

Write-Host "" 
Write-Host "K IMPERIA - IPFS Deployment (IPFS Desktop)" -ForegroundColor Yellow
Write-Host "" 

Require-Command -Name "curl.exe"

if (-not (Test-IpfsApi)) {
  Write-Host "ERROR: IPFS Desktop API not reachable at $IpfsApiBase" -ForegroundColor Red
  Write-Host "Open IPFS Desktop and ensure Kubo is running." -ForegroundColor Yellow
  Write-Host "Expected API endpoint: http://127.0.0.1:5001" -ForegroundColor Yellow
  exit 1
}

# Prepare deploy directory
if (Test-Path $DeployDir) {
  Remove-Item $DeployDir -Recurse -Force
}
New-Item -ItemType Directory -Path $DeployDir | Out-Null

Write-Host "Preparing frontend files..." -ForegroundColor Cyan

$filesToCopy = @(
  "index.html",
  "styles.css",
  "k-imperia.js",
  "admin.html",
  "admin.css",
  "admin.js"
)

foreach ($f in $filesToCopy) {
  $src = Join-Path $PSScriptRoot $f
  if (-not (Test-Path $src)) {
    Write-Host "ERROR: Missing required file: $src" -ForegroundColor Red
    exit 1
  }
  Copy-Item $src (Join-Path $DeployDir $f)
}

# Stamp Supabase Edge Functions base URL into JS (for IPFS builds)
$FunctionsBase = $env:SUPABASE_FUNCTIONS_BASE
if (-not [string]::IsNullOrWhiteSpace($FunctionsBase)) {
  $FunctionsBase = $FunctionsBase.Trim().TrimEnd('/')

  $intakeJsPath = Join-Path $DeployDir "k-imperia.js"
  $adminJsPath = Join-Path $DeployDir "admin.js"

  $intakeJs = Get-Content $intakeJsPath -Raw
  $intakeJs = $intakeJs -replace "__SUPABASE_FUNCTIONS_BASE__", $FunctionsBase
  Set-Content $intakeJsPath -Value $intakeJs

  $adminJs = Get-Content $adminJsPath -Raw
  $adminJs = $adminJs -replace "__SUPABASE_FUNCTIONS_BASE__", $FunctionsBase
  Set-Content $adminJsPath -Value $adminJs

  Write-Host "Stamped SUPABASE_FUNCTIONS_BASE into build." -ForegroundColor Green
} else {
  Write-Host "WARN: SUPABASE_FUNCTIONS_BASE is not set. Build will fall back to local /api/* endpoints." -ForegroundColor Yellow
}

Write-Host "Publishing to IPFS (via HTTP API)..." -ForegroundColor Cyan

$multipartArgs = @(
  "-s",
  "-X", "POST"
)

foreach ($f in $filesToCopy) {
  $path = Join-Path $DeployDir $f
  $multipartArgs += "-F"
  # Store files at the root of the wrapped directory
  $multipartArgs += "file=@$path;filename=$f"
}

$multipartArgs += "$IpfsApiBase/api/v0/add?wrap-with-directory=true&pin=true"

$output = & curl.exe @multipartArgs | Out-String
$lines = $output -split "`n" | Where-Object { $_.Trim() -ne "" }

$items = @()
foreach ($line in $lines) {
  try {
    $items += ($line | ConvertFrom-Json)
  } catch {
    # ignore
  }
}

if ($items.Count -lt 1) {
  Write-Host "ERROR: IPFS add failed (no JSON output)." -ForegroundColor Red
  exit 1
}

$cid = $items[-1].Hash

Set-Content (Join-Path $PSScriptRoot "LATEST_IPFS_CID.txt") -Value $cid

Write-Host "" 
Write-Host "DEPLOYMENT SUCCESSFUL" -ForegroundColor Green
Write-Host "CID: $cid" -ForegroundColor White
Write-Host "" 
Write-Host "Public links:" -ForegroundColor Cyan
Write-Host "  https://ipfs.io/ipfs/$cid/index.html" -ForegroundColor White
Write-Host "  https://ipfs.io/ipfs/$cid/admin.html" -ForegroundColor White
Write-Host "" 
Write-Host "CID saved to: LATEST_IPFS_CID.txt" -ForegroundColor Green

# Clean up
Remove-Item $DeployDir -Recurse -Force
