$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Add-Type -AssemblyName System.Web,System.Configuration
Add-Type -ReferencedAssemblies 'System.Configuration.dll','System.Web.dll' -TypeDefinition ([IO.File]::ReadAllText((Join-Path $root 'server\Yepas.AdminTool\RealtimeConfiguration.cs')))
$site = Join-Path ([IO.Path]::GetTempPath()) ('yepas-realtime-config-' + [Guid]::NewGuid().ToString('N'))
$null = New-Item -ItemType Directory -Path $site
$path = Join-Path $site 'Web.config'
function Read-Config {
    $map = New-Object System.Web.Configuration.WebConfigurationFileMap
    $map.VirtualDirectories.Add('/', (New-Object System.Web.Configuration.VirtualDirectoryMapping($site, $true)))
    return [System.Web.Configuration.WebConfigurationManager]::OpenMappedWebConfiguration($map, '/')
}
try {
    [IO.File]::WriteAllText($path, '<configuration><appSettings><add key="KeepMe" value="unchanged" /></appSettings><connectionStrings><clear/><add name="YepasApp" connectionString="Data Source=TEST;Initial Catalog=TEST;Password=test-only-not-deployed" /></connectionStrings><system.web><customErrors mode="On"/></system.web></configuration>')
    $config = Read-Config
    $connection = $config.ConnectionStrings.ConnectionStrings['YepasApp'].ConnectionString
    $config.ConnectionStrings.SectionInformation.ProtectSection('DataProtectionConfigurationProvider')
    $config.Save([System.Configuration.ConfigurationSaveMode]::Modified)
    [xml]$before = [IO.File]::ReadAllText($path)
    $encryptedConnections = $before.configuration.connectionStrings.OuterXml
    $key = [Convert]::ToBase64String((New-Object byte[] 32)) # Test fixture only.
    $hub = 'https://yepas-gateway.test:9443/hubs/orders'
    $publish = 'https://yepas-gateway.test:9443/internal/orders-changed'
    foreach ($iteration in 1..2) {
        [Yepas.AdminTool.RealtimeConfiguration]::Save($site, $hub, $publish, $key)
        $raw = [IO.File]::ReadAllText($path)
        [xml]$xml = $raw
        if ($raw.Contains($key) -or $raw.Contains('test-only-not-deployed')) { throw 'Secret persisted in clear text.' }
        if ($xml.configuration.connectionStrings.OuterXml -ne $encryptedConnections) { throw 'Encrypted connection strings were rewritten.' }
        $config = Read-Config
        if (!$config.AppSettings.SectionInformation.IsProtected) { throw 'Settings not protected.' }
        if ($config.AppSettings.Settings['YepasRealtimeKey'].Value -ne $key -or
            $config.AppSettings.Settings['YepasRealtimeHubUrl'].Value -ne $hub -or
            $config.AppSettings.Settings['KeepMe'].Value -ne 'unchanged' -or
            $config.ConnectionStrings.ConnectionStrings['YepasApp'].ConnectionString -ne $connection) { throw 'Config roundtrip failed.' }
    }
    $snapshot = [IO.File]::ReadAllText($path)
    foreach ($invalid in @('http://example.test/hubs/orders','https://example.test/wrong','https://example.test/hubs/orders#fragment','https://user@example.test/hubs/orders')) {
        $rejected = $false
        try { [Yepas.AdminTool.RealtimeConfiguration]::Save($site, $invalid, $publish, $key) } catch { $rejected = $true }
        if (!$rejected -or [IO.File]::ReadAllText($path) -ne $snapshot) { throw 'Invalid endpoint changed config.' }
    }
    $rejected = $false
    try { [Yepas.AdminTool.RealtimeConfiguration]::Save($site, $hub, $publish, 'invalid') } catch { $rejected = $true }
    if (!$rejected -or [IO.File]::ReadAllText($path) -ne $snapshot) { throw 'Invalid key changed config.' }
    Write-Host 'PASS: machine-encrypted settings, repeat setup, untouched encrypted connections, preserved settings and invalid-input rejection.'
}
finally {
    # Exact GUID-named fixture directory created above, never a workspace/home root.
    Remove-Item -LiteralPath $site -Recurse -Force
}
