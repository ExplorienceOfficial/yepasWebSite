param(
    [string]$RootPath = 'C:\YepasApp',
    [string]$TaskName = 'Yepas Daily Export'
)

$ErrorActionPreference = 'Stop'
$runner = Join-Path $RootPath 'tools\Run-AutoExport.ps1'
if (-not (Test-Path -LiteralPath $runner -PathType Leaf)) {
    throw 'Run-AutoExport.ps1 bulunamadı; önce sürüm paketindeki araçları kopyalayın.'
}

& schtasks.exe /Query /TN $TaskName 1>$null 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host ('Görev zaten kurulu: ' + $TaskName + '. Mevcut ayarlar değiştirilmedi.')
    exit 0
}

$action = 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "' + $runner + '"'
& schtasks.exe /Create /TN $TaskName /SC DAILY /ST 00:01 /RU SYSTEM /RL HIGHEST /TR $action
if ($LASTEXITCODE -ne 0) { throw 'Günlük aktarım görevi kurulamadı.' }
Write-Host ('Günlük aktarım görevi kuruldu: ' + $TaskName)
