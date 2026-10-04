param([string]$Server = 'lpc:.\YEPASDEV', [string]$Catalog = 'PrestoPlus_Local')
$ErrorActionPreference = 'Stop'
# Run in Windows PowerShell (.NET Framework). No live application data is changed.
$root = Split-Path -Parent $PSScriptRoot
$scratch = 'Yepas_ClosureTest_' + [Guid]::NewGuid().ToString('N')
$master = "Data Source=$Server;Initial Catalog=master;Integrated Security=True;Connect Timeout=5"
$app = "Data Source=$Server;Initial Catalog=$scratch;Integrated Security=True;Connect Timeout=5"
$legacy = "Data Source=$Server;Initial Catalog=$Catalog;Integrated Security=True;Connect Timeout=5"
Add-Type -AssemblyName System.Data
function Sql([string]$Connection, [string]$Query) {
    $c = New-Object System.Data.SqlClient.SqlConnection $Connection
    try {
        $c.Open()
        $command = $c.CreateCommand()
        $command.CommandText = $Query
        $command.CommandTimeout = 30
        return $command.ExecuteScalar()
    } finally { $c.Dispose() }
}
function Check([bool]$Ok, [string]$Name) {
    if (-not $Ok) { throw "FAILED: $Name" }
    Write-Host "PASS: $Name"
}
$created = $false
try {
    Sql $master "CREATE DATABASE [$scratch]" | Out-Null
    $created = $true
    Get-ChildItem (Join-Path $root 'database\migrations') -Filter '*.sql' |
        Where-Object { $_.Name -notlike '000*' } | Sort-Object Name | ForEach-Object {
            # All source scripts retain their production DB guards. Only this isolated
            # harness substitutes its freshly generated database name in memory.
            $text = [IO.File]::ReadAllText($_.FullName).Replace('EkmekSiparis', $scratch)
            foreach ($batch in [regex]::Split($text, '(?im)^\s*GO\s*$')) {
                if ($batch.Trim()) { Sql $app $batch | Out-Null }
            }
        }
    $migration = [IO.File]::ReadAllText((Join-Path $root 'database\migrations\011_delivery_day_closure.sql')).Replace('EkmekSiparis', $scratch)
    Sql $app $migration | Out-Null
    Check ((Sql $app 'SELECT COUNT(*) FROM dbo.SchemaMigrations WHERE VersionNumber=11') -eq 1) 'migration 011 repeat is safe'

    $probeSource = @'
using System;
using System.Collections.Generic;
using System.Threading;
using Yepas.Api.Data;
using Yepas.Api.Domain;
using Yepas.Api.Models;
public sealed class ClosureWriteProbe {
    public readonly ManualResetEvent Done = new ManualResetEvent(false);
    public Exception Error;
    public static void Write(bool customer, string status, DateTime date) {
        var schedule = new LegacyCustomerSchedule { LegacyMbId=1,
            LegacyCustomerId=1, LegacyDepartmentId=1, LegacyPersonnelId=1,
            DistributionDays=new[] { true,true,true,true,true,true,true } };
        var input = new SaveCustomerOrderRequest { Status=status };
        var lines = new List<PreparedOrderLine>();
        var key = Guid.NewGuid().ToString("N");
        var hash = new byte[32];
        var repo = new OrderRepository();
        if (customer) repo.SaveCustomerOrder(1,schedule,input,status,lines,key,hash);
        else repo.SaveAdminOrder(1,schedule,input,status,lines,key,hash,date);
    }
    public void Start(DateTime date) {
        ThreadPool.QueueUserWorkItem(_ => {
            try { Write(false,"SUBMITTED",date); }
            catch (Exception e) { Error=e; }
            finally { Done.Set(); }
        });
    }
}
'@
    # Compile the actual repository sources with the Framework runtime, without
    # requiring execution of an unsigned test EXE or changing Windows policy.
    $names = @('RuntimeSettings.cs','Data\DatabaseConnections.cs','Data\IstanbulTimestamp.cs',
        'Data\AtomicOrderDaySynchronizer.cs','Data\OrderRepository.cs','Data\AuthRepository.cs',
        'Data\OrderFinalizationRepository.cs','Data\LegacyOrderExporter.cs',
        'Domain\OrderDaySyncPolicy.cs','Domain\OrderWindowPolicy.cs','Domain\DriverAccountPolicy.cs','Domain\AccountNamePolicy.cs',
        'Domain\OrderSubmissionPolicy.cs','Models\OrderModels.cs',
        'Models\AdminOrderModels.cs','Models\CatalogProduct.cs')
    $units = @($probeSource)
    $usings = New-Object 'System.Collections.Generic.HashSet[string]'
    foreach ($name in $names) {
        $source = [IO.File]::ReadAllText((Join-Path $root ('server\Yepas.Api\' + $name)))
        foreach ($match in [regex]::Matches($source, '(?m)^using [^\r\n]+;')) {
            $null = $usings.Add($match.Value)
        }
        $units += [regex]::Replace($source, '(?m)^using [^\r\n]+;\r?\n', '')
    }
    foreach ($match in [regex]::Matches($probeSource, '(?m)^using [^\r\n]+;')) {
        $null = $usings.Add($match.Value)
    }
    $units[0] = [regex]::Replace($probeSource, '(?m)^using [^\r\n]+;\r?\n', '')
    Add-Type -ReferencedAssemblies 'System.Data.dll','System.Configuration.dll','System.Core.dll' -TypeDefinition (($usings -join "`n") + "`n" + ($units -join "`n"))
    [Yepas.Api.Data.DatabaseConnections]::ConfigureForProcess($app, $legacy)
    $today = [Yepas.Api.Data.IstanbulTimestamp]::FromUtc([DateTime](Sql $app 'SELECT GETUTCDATE()')).Date
    $date = $today.AddDays(1)
    $day = $date.ToString('yyyyMMdd')
    Sql $app "UPDATE dbo.OrderSettings SET OverrideMode=N'OPEN', OverrideUntil=NULL" | Out-Null
    $sync = New-Object Yepas.Api.Data.AtomicOrderDaySynchronizer
    $null = $sync.Synchronize($null, $date, $false)
    Check ((Sql $app "SELECT COUNT(*) FROM dbo.OrderFinalizations WHERE DeliveryDate='$day' AND ClosedAt IS NULL") -eq 1) 'manual export does not close'
    $null = $sync.Synchronize($null, $date, $true)
    Check ((Sql $app "SELECT COUNT(*) FROM dbo.OrderFinalizations WHERE DeliveryDate='$day' AND ClosedAt IS NOT NULL") -eq 1) 'automatic export closes atomically'
    $attempts = Sql $app "SELECT AttemptCount FROM dbo.OrderFinalizations WHERE DeliveryDate='$day'"
    $null = $sync.Synchronize($null, $date, $true)
    Check ((Sql $app "SELECT AttemptCount FROM dbo.OrderFinalizations WHERE DeliveryDate='$day'") -eq $attempts) 'repeat job skips closed day'
    foreach ($customer in @($false, $true)) {
        foreach ($status in @('SUBMITTED','CANCELLED','NO_PRODUCT')) {
            $denied = $false
            try { [ClosureWriteProbe]::Write($customer,$status,$date) }
            catch { $denied = $_.Exception.ToString().Contains('OrderDayClosedException') }
            Check $denied "write rejected customer=$customer status=$status"
        }
    }
    Sql $app @"
CREATE TRIGGER dbo.ClosureFailureProbe ON dbo.OrderFinalizations AFTER UPDATE AS
IF EXISTS(SELECT 1 FROM inserted WHERE ClosedAt IS NOT NULL)
    RAISERROR('Injected closure failure',16,1);
"@ | Out-Null
    $other = $date.AddDays(1)
    $failed = $false
    try { $null = $sync.Synchronize($null,$other,$true) } catch { $failed = $true }
    Check $failed 'injected SQL failure reaches caller'
    Check ((Sql $app ("SELECT COUNT(*) FROM dbo.OrderFinalizations WHERE DeliveryDate='" + $other.ToString('yyyyMMdd') + "'")) -eq 0) 'export metadata and closure both rollback'
    Sql $app 'DROP TRIGGER dbo.ClosureFailureProbe' | Out-Null

    # A real repository write waits on the same transaction-owned day lock.
    $race = $date.AddDays(2)
    $raceDay = $race.ToString('yyyyMMdd')
    $null = $sync.Synchronize($null,$race,$false)
    $lock = New-Object System.Data.SqlClient.SqlConnection $app
    try {
        $lock.Open()
        $tx = $lock.BeginTransaction()
        $cmd = $lock.CreateCommand()
        $cmd.Transaction = $tx
        $cmd.CommandText = "DECLARE @r int; EXEC @r=sp_getapplock @Resource='YepasDeliveryDay-$raceDay',@LockMode='Exclusive',@LockOwner='Transaction'; SELECT @r;"
        Check ($cmd.ExecuteScalar() -ge 0) 'race day lock acquired'
        $probe = New-Object ClosureWriteProbe
        $probe.Start($race)
        Check (-not $probe.Done.WaitOne(300)) 'repository writer waits during closure transaction'
        $cmd.CommandText = "UPDATE dbo.OrderFinalizations SET ClosedAt=GETDATE() WHERE DeliveryDate='$raceDay'"
        $null = $cmd.ExecuteNonQuery()
        $tx.Commit()
        Check ($probe.Done.WaitOne(10000)) 'waiting writer finishes after commit'
        Check ($probe.Error -is [Yepas.Api.Domain.OrderDayClosedException]) 'waiting writer observes committed closure and rejects'
    } finally { $lock.Dispose() }
    Check ((Sql $app 'SELECT COUNT(*) FROM dbo.Orders') -eq 0) 'denied requests never create an order'
    # Real password-change repository tests; no DriverAccounts dependency for admin.
    foreach ($role in @('DRIVER','ADMIN','CUSTOMER')) {
        $salt = New-Object byte[] 32
        $secret = New-Object byte[] 32
        $random = [Security.Cryptography.RandomNumberGenerator]::Create()
        $random.GetBytes($salt); $random.GetBytes($secret); $random.Dispose()
        $oldPassword = if ($role -eq 'DRIVER') { '0123' } else { 'StrongOldPassword!' }
        $hash = [Yepas.Api.Data.AuthRepository]::HashPassword($oldPassword,$salt,150000)
        $sha = [Security.Cryptography.SHA256]::Create()
        $tokenHash = $sha.ComputeHash($secret); $sha.Dispose()
        $hashHex = [BitConverter]::ToString($hash).Replace('-','')
        $saltHex = [BitConverter]::ToString($salt).Replace('-','')
        $tokenHex = [BitConverter]::ToString($tokenHash).Replace('-','')
        $token = [Convert]::ToBase64String($secret).TrimEnd('=').Replace('+','-').Replace('/','_')
        $userId = Sql $app "INSERT dbo.Users(LoginName,LoginNameNormalized,PasswordHash,PasswordSalt,PasswordIterations,PasswordAlgorithm,IsActive) VALUES('$role','$role',0x$hashHex,0x$saltHex,150000,'PBKDF2-SHA256',1); SELECT CAST(SCOPE_IDENTITY() AS INT);"
        Sql $app "INSERT dbo.UserRoles VALUES($userId,'$role'); INSERT dbo.AuthSessions(UserId,RoleCode,TokenHash,ExpiresAtUtc) VALUES($userId,'$role',0x$tokenHex,DATEADD(day,1,GETUTCDATE()));" | Out-Null
        $repo = New-Object Yepas.Api.Data.AuthRepository
        foreach ($invalid in @('123','12345','12a4', $(if ($role -eq 'DRIVER') { 'StrongNewPassword!' } else { '0456' }))) {
            $errorMessage = $null
            Check (-not $repo.ChangePassword($userId,$token,$oldPassword,$invalid,[ref]$errorMessage)) "$role rejects incompatible new password"
        }
        $newPassword = if ($role -eq 'DRIVER') { '0456' } else { 'StrongNewPassword!' }
        $errorMessage = $null
        Check ($repo.ChangePassword($userId,$token,$oldPassword,$newPassword,[ref]$errorMessage)) "$role accepts its own password policy"
        Check ((Sql $app "SELECT MustChangePassword FROM dbo.Users WHERE UserId=$userId") -eq 0) "$role completes temporary password change"
    }
    Write-Host 'Day closure integration tests complete; isolated test database will be removed.'
} finally {
    if ($created) {
        [System.Data.SqlClient.SqlConnection]::ClearAllPools()
        # Exact database created by this test only. Never touches EkmekSiparis/PrestoPlus.
        Sql $master "ALTER DATABASE [$scratch] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [$scratch]" | Out-Null
    }
}
