$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Add-Type -Path (Join-Path $root 'server\Shared\RealtimeTicket.cs')
$key = New-Object byte[] 32
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
try { $rng.GetBytes($key) } finally { $rng.Dispose() }
$now = [DateTime]::UtcNow
$token = [Yepas.RealtimeSecurity.RealtimeTicket]::Issue($key, 'admin', 42, $now, 300)
function Assert-Ticket([string]$value, [string]$purpose, [DateTime]$time, [bool]$expected) {
    $id = 0; $expires = [DateTime]::MinValue; $nonce = ''
    $actual = [Yepas.RealtimeSecurity.RealtimeTicket]::Validate($key, $value, $purpose, $time, [ref]$id, [ref]$expires, [ref]$nonce)
    if ($actual -ne $expected) { throw 'Ticket validation assertion failed.' }
    if ($actual -and ($id -ne 42 -or $nonce.Length -ne 32 -or $expires.Kind -ne [DateTimeKind]::Utc)) {
        throw 'Invalid authenticated identity or expiry.'
    }
}
Assert-Ticket $token 'admin' $now $true
Assert-Ticket $token 'publish' $now $false
Assert-Ticket $token 'admin' $now.AddSeconds(300) $false
Assert-Ticket $token 'admin' $now.AddSeconds(-31) $false
Assert-Ticket ($token.Substring(0, $token.Length - 3)) 'admin' $now $false
Assert-Ticket 'malformed.ticket!' 'admin' $now $false
Assert-Ticket '' 'admin' $now $false
$publish = [Yepas.RealtimeSecurity.RealtimeTicket]::Issue($key, 'publish', 42, $now, 30)
Assert-Ticket $publish 'publish' $now $true
Assert-Ticket $publish 'admin' $now $false
$weakRejected = $false
try { [Yepas.RealtimeSecurity.RealtimeTicket]::ReadKey('AA==') | Out-Null } catch { $weakRejected = $true }
if (-not $weakRejected) { throw 'Weak key was accepted.' }
Write-Host 'PASS: realtime ticket identity, expiry, purpose separation, malformed input and weak-key checks.'
