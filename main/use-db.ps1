# Usage:
#   .\use-db.ps1 postgres          save the active DB's files, then switch to configs\postgres
#   .\use-db.ps1 postgres -Save    save the current root files into configs\postgres and mark it active
#   .\use-db.ps1 clean             save the active DB's files, back up, then clear the root for a fresh install
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('postgres','mysql','mongo','supabase','firebase','clean')]
  [string]$Target,
  [switch]$Save
)
$ErrorActionPreference = 'Stop'
$root       = $PSScriptRoot
$cfgRoot    = Join-Path $root 'configs'
$activeFile = Join-Path $cfgRoot '.active'
$files      = @('.env.local', 'underpeaks.config.json')

function Save-To([string]$name) {
  $dir = Join-Path $cfgRoot $name
  New-Item -ItemType Directory -Force $dir | Out-Null
  foreach ($f in $files) {
    $src = Join-Path $root $f
    if (Test-Path $src) { Copy-Item $src (Join-Path $dir $f) -Force; Write-Host "saved $f -> configs\$name" }
    else { Write-Host "skipped $f (not in project root)" -ForegroundColor Yellow }
  }
}

function Backup-Root {
  $bk = Join-Path $cfgRoot ('_backup\' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
  New-Item -ItemType Directory -Force $bk | Out-Null
  foreach ($f in $files) {
    $cur = Join-Path $root $f
    if (Test-Path $cur) { Copy-Item $cur (Join-Path $bk $f) -Force }
  }
}

function Get-Active {
  if (Test-Path $activeFile) { return (Get-Content $activeFile -Raw).Trim() }
  return ''
}

New-Item -ItemType Directory -Force $cfgRoot | Out-Null

# explicit save
if ($Save -and $Target -ne 'clean') {
  Save-To $Target
  Set-Content $activeFile $Target -NoNewline
  Write-Host "Saved and marked active: $Target" -ForegroundColor Green
  return
}

# clean root for a fresh install
if ($Target -eq 'clean') {
  $active = Get-Active
  Backup-Root
  if ($active) { Save-To $active }
  foreach ($f in $files) {
    $p = Join-Path $root $f
    if (Test-Path $p) { Remove-Item $p -Force; Write-Host "removed $f" }
  }
  if (Test-Path $activeFile) { Remove-Item $activeFile -Force }
  Write-Host "Root cleared. Run the installer, then: .\use-db.ps1 <db> -Save" -ForegroundColor Green
  return
}

# switch
$dir = Join-Path $cfgRoot $Target
if (-not (Test-Path $dir)) {
  Write-Host "No saved config for '$Target'. Run '.\use-db.ps1 clean', install, then '.\use-db.ps1 $Target -Save'" -ForegroundColor Red
  exit 1
}

Backup-Root
$active = Get-Active
if ($active -and $active -ne $Target) { Save-To $active }   # sync changes made since last save

foreach ($f in $files) {
  $src = Join-Path $dir $f
  $dst = Join-Path $root $f
  if (Test-Path $src) { Copy-Item $src $dst -Force; Write-Host "using $f from configs\$Target" }
  elseif (Test-Path $dst) { Remove-Item $dst -Force; Write-Host "removed $f (none saved for $Target)" -ForegroundColor Yellow }
}
Set-Content $activeFile $Target -NoNewline
Write-Host "Active DB: $Target. Restart the dev server." -ForegroundColor Green