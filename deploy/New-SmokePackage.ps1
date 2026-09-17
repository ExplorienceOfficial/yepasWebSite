param(
    [string]$Version = '0.1.0-smoke'
)

$ErrorActionPreference = 'Stop'

function Get-Sha256Hex([string]$Path) {
    $stream = [System.IO.File]::OpenRead($Path)
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
        return ([System.BitConverter]::ToString($sha.ComputeHash($stream))).Replace('-', '').ToLowerInvariant()
    }
    finally {
        $sha.Dispose()
        $stream.Dispose()
    }
}

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$repositoryRoot = [System.IO.Path]::GetFullPath((Join-Path $scriptDirectory '..'))
$artifactsRoot = [System.IO.Path]::GetFullPath((Join-Path $repositoryRoot 'artifacts'))
$safeVersion = $Version -replace '[^A-Za-z0-9._-]', '-'
$safeGitDirectory = $repositoryRoot.Replace('\', '/')
$commitOutput = & git -c ("safe.directory=" + $safeGitDirectory) -C $repositoryRoot rev-parse --short=12 HEAD
if ($LASTEXITCODE -ne 0 -or [String]::IsNullOrWhiteSpace($commitOutput)) {
    throw 'Git commit kimliği okunamadı.'
}
$commit = $commitOutput.Trim()

$releaseName = 'yepas-{0}-{1}' -f $safeVersion, $commit
$stageRoot = [System.IO.Path]::GetFullPath((Join-Path $artifactsRoot $releaseName))
$zipPath = [System.IO.Path]::GetFullPath((Join-Path $artifactsRoot ($releaseName + '.zip')))
if (-not $stageRoot.StartsWith($artifactsRoot + [System.IO.Path]::DirectorySeparatorChar,
        [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'Güvenli olmayan staging yolu reddedildi.'
}

if (Test-Path -LiteralPath $stageRoot) { Remove-Item -LiteralPath $stageRoot -Recurse -Force }
if (Test-Path -LiteralPath $zipPath) { Remove-Item -LiteralPath $zipPath -Force }
New-Item -ItemType Directory -Path $stageRoot | Out-Null

Push-Location $repositoryRoot
try {
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'Frontend statik derlemesi başarısız.' }

    $msbuild = 'C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools\MSBuild\Current\Bin\MSBuild.exe'
    if (-not (Test-Path -LiteralPath $msbuild)) { throw 'MSBuild bulunamadı.' }
    & $msbuild 'server\Yepas.Api\Yepas.Api.csproj' /t:Rebuild /p:Configuration=Release
    if ($LASTEXITCODE -ne 0) { throw 'API Release derlemesi başarısız.' }
    & $msbuild 'server\Yepas.AdminTool\Yepas.AdminTool.csproj' /t:Rebuild /p:Configuration=Release
    if ($LASTEXITCODE -ne 0) { throw 'Admin aracı Release derlemesi başarısız.' }

    $siteRoot = Join-Path $stageRoot 'site'
    $databaseRoot = Join-Path $stageRoot 'database'
    $toolsRoot = Join-Path $stageRoot 'tools'
    New-Item -ItemType Directory -Path $siteRoot,$databaseRoot,$toolsRoot | Out-Null

    Copy-Item -Path (Join-Path $repositoryRoot 'out\*') -Destination $siteRoot -Recurse -Force
    Copy-Item -LiteralPath (Join-Path $repositoryRoot 'server\Yepas.Api\Global.asax') -Destination $siteRoot
    Copy-Item -LiteralPath (Join-Path $repositoryRoot 'server\Yepas.Api\Web.config') -Destination $siteRoot
    $packagedWebConfig = Join-Path $siteRoot 'Web.config'
    [xml]$packagedConfig = Get-Content -LiteralPath $packagedWebConfig
    $packagedConfig.configuration.'system.web'.compilation.debug = 'false'
    $packagedConfig.configuration.appSettings.add |
        Where-Object { $_.key -eq 'YepasDevelopmentMode' } |
        ForEach-Object { $_.value = 'false' }
    $packagedConfig.Save($packagedWebConfig)
    $siteBin = Join-Path $siteRoot 'bin'
    New-Item -ItemType Directory -Path $siteBin | Out-Null
    Get-ChildItem -LiteralPath (Join-Path $repositoryRoot 'server\Yepas.Api\bin') -File -Filter '*.dll' |
        ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $siteBin }
    Copy-Item -Path (Join-Path $repositoryRoot 'database\migrations\*') -Destination $databaseRoot -Recurse -Force
    Copy-Item -LiteralPath (Join-Path $repositoryRoot 'deploy\Configure-Smoke.ps1') -Destination $toolsRoot
    Copy-Item -LiteralPath (Join-Path $repositoryRoot 'server\Yepas.AdminTool\bin\Release\Yepas.AdminTool.exe') -Destination $toolsRoot
    Copy-Item -LiteralPath (Join-Path $repositoryRoot 'server\Yepas.AdminTool\bin\Release\Yepas.AdminTool.exe.config') -Destination $toolsRoot
    Copy-Item -LiteralPath (Join-Path $repositoryRoot 'deploy\INSTALL-SMOKE.md') -Destination $stageRoot

    @(
        'Version=' + $safeVersion
        'Commit=' + $commit
        'BuiltAtUtc=' + [DateTime]::UtcNow.ToString('o')
        'Target=Windows 7 SP1 x64; IIS 7.5; .NET Framework 4.8; SQL Server 2005'
        'ContainsSecrets=False'
    ) | Set-Content -LiteralPath (Join-Path $stageRoot 'MANIFEST.txt') -Encoding UTF8

    Get-ChildItem -LiteralPath $stageRoot -Recurse -File |
        Where-Object { $_.Name -ne 'SHA256SUMS.txt' } |
        Sort-Object FullName |
        ForEach-Object {
            $relative = $_.FullName.Substring($stageRoot.Length + 1)
            '{0}  {1}' -f (Get-Sha256Hex $_.FullName), $relative
        } | Set-Content -LiteralPath (Join-Path $stageRoot 'SHA256SUMS.txt') -Encoding ASCII

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory(
        $stageRoot, $zipPath, [System.IO.Compression.CompressionLevel]::Optimal, $false)
    Write-Host ('Smoke paketi hazır: ' + $zipPath)
}
finally {
    Pop-Location
}
