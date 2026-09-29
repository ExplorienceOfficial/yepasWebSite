$ErrorActionPreference = 'Stop'
$appcmd = Join-Path $env:WINDIR 'system32\inetsrv\appcmd.exe'
if (-not (Test-Path -LiteralPath $appcmd)) { throw 'IIS appcmd bulunamadı.' }
$sitePath = (& $appcmd list vdir 'Yepas Smoke/' /text:physicalPath | Select-Object -First 1).Trim()
if ($LASTEXITCODE -ne 0 -or -not $sitePath -or -not (Test-Path -LiteralPath $sitePath)) {
    throw 'Etkin Yepas Smoke site yolu bulunamadı.'
}
$releasePath = Split-Path -Parent $sitePath
$runner = Join-Path $releasePath 'tools\Yepas.AutoExport.exe'
if (-not (Test-Path -LiteralPath $runner)) { throw 'Günlük aktarım aracı bulunamadı.' }
& $runner --site-path $sitePath
exit $LASTEXITCODE
