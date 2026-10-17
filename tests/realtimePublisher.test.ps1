$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$ticketSource = [IO.File]::ReadAllText((Join-Path $root 'server\Shared\RealtimeTicket.cs'))
$publisherSource = [IO.File]::ReadAllText((Join-Path $root 'server\Yepas.Api\Data\RealtimePublisher.cs'))
$databaseSource = [IO.File]::ReadAllText((Join-Path $root 'server\Yepas.Api\Data\DatabaseConnections.cs'))
$runtimeSource = [IO.File]::ReadAllText((Join-Path $root 'server\Yepas.Api\RuntimeSettings.cs'))
$usings = New-Object 'System.Collections.Generic.HashSet[string]'
$units = @()
foreach ($source in @($ticketSource, $publisherSource, $databaseSource, $runtimeSource)) {
    foreach ($match in [regex]::Matches($source, '(?m)^using [^\r\n]+;')) { $null = $usings.Add($match.Value) }
    $units += [regex]::Replace($source, '(?m)^using [^\r\n]+;\r?\n', '')
}
Add-Type -ReferencedAssemblies 'System.Core.dll','System.Configuration.dll','System.Net.Http.dll','System.Data.dll' -TypeDefinition (($usings -join "`n") + "`n" + ($units -join "`n"))
$key = [Convert]::ToBase64String((New-Object byte[] 32)) # Test-only; never deployed.
foreach ($case in @(
    @{ Url=''; Key='' },
    @{ Url='http://127.0.0.1/internal/orders-changed'; Key=$key },
    @{ Url='https://127.0.0.1/internal/orders-changed'; Key='invalid' },
    @{ Url='https://127.0.0.1:1/internal/orders-changed'; Key=$key }
)) {
    [Yepas.Api.Data.RealtimePublisher]::ConfigureForProcess($case.Url,$case.Key)
    if ([Yepas.Api.Data.RealtimePublisher]::TrySend()) { throw 'Unexpected publication success.' }
}
Write-Host 'PASS: disabled, insecure URL, malformed key and unreachable service never throw into committed order flow.'
