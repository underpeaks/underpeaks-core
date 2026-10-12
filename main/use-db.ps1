# Usage:
#   .\use-db.ps1 postgres          switch the active config to configs\postgres
#   .\use-db.ps1 postgres -Save    save the current root files into configs\postgres
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('postgres','mysql','mongo','supabase','firebase')]
  [string]$Target,
  [switch]$Save
)
$ErrorActionPreference = 'Stop'
$root  = $PSScriptRoot
$dir   = Join-Path $root "configs\$Target"
$files = @('.env.local', 'underpeaks.config.json')

if ($Save) {
  New-Item -ItemType Directory -Force $dir | Out-Null
  foreach ($f in $files) {
    $src = Join-Path $root $f
    if (Test-Path $src) { Copy-Item $src (Join-Path $dir $f) -Force; Write-Host "saved $f -> configs\$Target" }
    else { Write-Host "skipped $f (not in project root)" -ForegroundColor Yellow }
  }
  return
}

if (-not (Test-Path $dir)) {
  Write-Host "No saved config for '$Target'. Run the installer, then: .\use-db.ps1 $Target -Save" -ForegroundColor Red
  exit 1
}

# back up whatever is active now
$bk = Join-Path $root ("configs\_backup\" + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Force $bk | Out-Null
foreach ($f in $files) {
  $cur = Join-Path $root $f
  if (Test-Path $cur) { Copy-Item $cur (Join-Path $bk $f) -Force }
}

# switch; a file missing from the saved set is removed so the installer starts clean
foreach ($f in $files) {
  $src = Join-Path $dir $f
  $dst = Join-Path $root $f
  if (Test-Path $src) { Copy-Item $src $dst -Force; Write-Host "using $f from configs\$Target" }
  elseif (Test-Path $dst) { Remove-Item $dst -Force; Write-Host "removed $f (none saved for $Target)" -ForegroundColor Yellow }
}
Write-Host "Active DB: $Target. Restart the dev server." -ForegroundColor Green