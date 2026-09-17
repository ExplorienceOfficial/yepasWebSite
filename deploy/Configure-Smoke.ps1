param(
    [Parameter(Mandatory = $true)]
    [string]$SitePath
)

$ErrorActionPreference = 'Stop'
$resolvedSite = (Resolve-Path -LiteralPath $SitePath).Path
$webConfigPath = Join-Path $resolvedSite 'Web.config'
if (-not (Test-Path -LiteralPath $webConfigPath -PathType Leaf)) {
    throw 'SitePath altında Web.config bulunamadı.'
}

$appSecret = Read-Host 'EkmekSiparis bağlantı dizesi' -AsSecureString
$catalogSecret = Read-Host 'PrestoPlus DEV bağlantı dizesi' -AsSecureString
$appPointer = [IntPtr]::Zero
$catalogPointer = [IntPtr]::Zero

try {
    $appPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($appSecret)
    $catalogPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($catalogSecret)
    $appConnection = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($appPointer)
    $catalogConnection = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($catalogPointer)
    # Windows 7 ships with PowerShell 2, which can run on CLR 2.0 where
    # String.IsNullOrWhiteSpace is unavailable.
    if ([String]::IsNullOrEmpty($appConnection) -or
        [String]::IsNullOrEmpty($catalogConnection) -or
        $appConnection.Trim().Length -eq 0 -or
        $catalogConnection.Trim().Length -eq 0) {
        throw 'Bağlantı dizeleri boş olamaz.'
    }

    [xml]$config = Get-Content -LiteralPath $webConfigPath
    $config.configuration.connectionStrings.add |
        Where-Object { $_.name -eq 'YepasApp' } |
        ForEach-Object { $_.connectionString = $appConnection }
    $config.configuration.connectionStrings.add |
        Where-Object { $_.name -eq 'YepasCatalog' } |
        ForEach-Object { $_.connectionString = $catalogConnection }
    $config.Save($webConfigPath)

    $aspnetRegiis = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\aspnet_regiis.exe'
    if (-not (Test-Path -LiteralPath $aspnetRegiis)) { throw 'aspnet_regiis.exe bulunamadı.' }
    & $aspnetRegiis -pef 'connectionStrings' $resolvedSite -prov 'DataProtectionConfigurationProvider'
    if ($LASTEXITCODE -ne 0) { throw 'connectionStrings bölümü şifrelenemedi.' }
    Write-Host 'Bağlantı dizeleri yazıldı ve makineye bağlı olarak şifrelendi.'
}
finally {
    if ($appPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($appPointer) }
    if ($catalogPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($catalogPointer) }
    $appConnection = $null
    $catalogConnection = $null
}
