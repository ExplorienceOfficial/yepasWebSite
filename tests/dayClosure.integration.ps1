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
    public static void SubmitUpdateCancel(bool customer, DateTime date) {
        var schedule = new LegacyCustomerSchedule { LegacyMbId=customer?3:2,
            LegacyCustomerId=1, LegacyDepartmentId=1, LegacyPersonnelId=1,
            DistributionDays=new[] { true,true,true,true,true,true,true } };
        var repo = new OrderRepository();
        var input = new SaveCustomerOrderRequest { Status="SUBMITTED", Note="Teslimat notu\n<script>test</script>" };
        var lines = new List<PreparedOrderLine> { new PreparedOrderLine {
            UStokId=1,AStokId=0,Quantity=20,ProductCode="TEST",ProductName="TEST" } };
        var hash = new byte[32];
        OrderView saved = customer ? repo.SaveCustomerOrder(1,schedule,input,"SUBMITTED",lines,Guid.NewGuid().ToString("N"),hash) :
            repo.SaveAdminOrder(1,schedule,input,"SUBMITTED",lines,Guid.NewGuid().ToString("N"),hash,date);
        if (saved.Lines.Count!=1 || saved.Lines[0].Quantity!=20 || saved.Note!=input.Note) throw new Exception("Create/note roundtrip failed.");
        input.Revision=saved.Revision; lines[0].Quantity=25;
        saved = customer ? repo.SaveCustomerOrder(1,schedule,input,"SUBMITTED",lines,Guid.NewGuid().ToString("N"),hash) :
            repo.SaveAdminOrder(1,schedule,input,"SUBMITTED",lines,Guid.NewGuid().ToString("N"),hash,date);
        if (saved.Revision!=2 || saved.Lines[0].Quantity!=25 || saved.Note!=input.Note) throw new Exception("Update/note preservation failed.");
        var stops = new List<DriverRouteStopView> { new DriverRouteStopView {
            LegacyCustomerId=1,LegacyDepartmentId=1,LegacyMbId=schedule.LegacyMbId } };
        var method = typeof(DriverRouteRepository).GetMethod("ReadOrders",
            System.Reflection.BindingFlags.Static|System.Reflection.BindingFlags.NonPublic);
        var driverOrders = (IDictionary<string,OrderView>)method.Invoke(null,
            new object[] { stops,"delivery",saved.DeliveryDate.AddDays(-1),saved.DeliveryDate });
        if (driverOrders["1:1"].Note!=input.Note) throw new Exception("Driver note read failed.");
        input.Revision=saved.Revision; input.Status="CANCELLED";
        if (customer) repo.SaveCustomerOrder(1,schedule,input,"CANCELLED",new List<PreparedOrderLine>(),Guid.NewGuid().ToString("N"),hash);
        else repo.SaveAdminOrder(1,schedule,input,"CANCELLED",new List<PreparedOrderLine>(),Guid.NewGuid().ToString("N"),hash,date);
        if (repo.ReadOrder(schedule.LegacyMbId,saved.DeliveryDate)!=null) throw new Exception("Cancel failed.");
    }
}
'@
    # Compile the actual repository sources with the Framework runtime, without
    # requiring execution of an unsigned test EXE or changing Windows policy.
    $names = @('RuntimeSettings.cs','Data\DatabaseConnections.cs','Data\IstanbulTimestamp.cs',
        '..\Shared\RealtimeTicket.cs','Data\RealtimePublisher.cs',
        'Data\AtomicOrderDaySynchronizer.cs','Data\OrderRepository.cs','Data\AuthRepository.cs',
        'Data\DriverRouteRepository.cs','Domain\DriverRoutePolicy.cs','Models\DriverRouteModels.cs',
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
    Add-Type -ReferencedAssemblies 'System.Data.dll','System.Configuration.dll','System.Core.dll','System.Net.Http.dll' -TypeDefinition (($usings -join "`n") + "`n" + ($units -join "`n"))
    [Yepas.Api.Data.DatabaseConnections]::ConfigureForProcess($app, $legacy)
    $sqlClock = [DateTime]::MinValue
    $null = (New-Object Yepas.Api.Data.OrderRepository).ReadSettings([ref]$sqlClock)
    Check ($sqlClock.Kind -eq [DateTimeKind]::Utc) 'SQL GETUTCDATE is explicitly UTC at repository boundary'
    $clockKey = New-Object byte[] 32 # Isolated test-only key.
    $clockToken = [Yepas.RealtimeSecurity.RealtimeTicket]::Issue($clockKey,'admin',42,$sqlClock,300)
    $clockId=0; $clockExpires=[DateTime]::MinValue; $clockNonce=''
    Check ([Yepas.RealtimeSecurity.RealtimeTicket]::Validate($clockKey,$clockToken,'admin',[DateTime]::UtcNow,[ref]$clockId,[ref]$clockExpires,[ref]$clockNonce)) 'SQL-issued ticket validates against actual UTC without local-time shift'
    $outboxMigration = [IO.File]::ReadAllText((Join-Path $root 'database\migrations\012_realtime_outbox.sql')).Replace('EkmekSiparis', $scratch)
    Sql $app $outboxMigration | Out-Null
    Check ((Sql $app 'SELECT COUNT(*) FROM dbo.SchemaMigrations WHERE VersionNumber=12') -eq 1) 'outbox migration repeat is safe'
    $testKey = [Convert]::ToBase64String((New-Object byte[] 32))
    [Yepas.Api.Data.RealtimePublisher]::ConfigureForProcess('https://127.0.0.1:1/internal/orders-changed',$testKey)
    [Yepas.Api.Data.RealtimePublisher]::NotifyCommitted()
    Check ((Sql $app 'SELECT DeliveredFingerprint FROM dbo.RealtimeDeliveryState WHERE StateId=1') -eq [DBNull]::Value) 'failed delivery never acknowledges snapshot'
    $drain = [Yepas.Api.Data.RealtimePublisher].GetMethod('Drain',[Reflection.BindingFlags]'NonPublic,Static')
    $delivery = [Func[bool]] { return $true }
    $null = $drain.Invoke($null,@($delivery))
    $previous = [Convert]::ToBase64String((Sql $app 'SELECT DeliveredFingerprint FROM dbo.RealtimeDeliveryState WHERE StateId=1'))
    Sql $app 'UPDATE dbo.OrderSettings SET CutoffMinute=CutoffMinute+1' | Out-Null
    $delivery = [Func[bool]] {
        Sql $app 'UPDATE dbo.OrderSettings SET CutoffMinute=CutoffMinute+1' | Out-Null
        return $true
    }
    $null = $drain.Invoke($null,@($delivery))
    $captured = [Convert]::ToBase64String((Sql $app 'SELECT DeliveredFingerprint FROM dbo.RealtimeDeliveryState WHERE StateId=1'))
    Check ($previous -ne $captured) 'successful delivery acknowledges captured source snapshot'
    $delivery = [Func[bool]] { return $true }
    $null = $drain.Invoke($null,@($delivery))
    $latest = [Convert]::ToBase64String((Sql $app 'SELECT DeliveredFingerprint FROM dbo.RealtimeDeliveryState WHERE StateId=1'))
    Check ($captured -ne $latest) 'change committed during delivery is detected on next reconciliation'
    # Deliberately break both notification tables. Actual business repositories
    # must still commit; no SQL writes to the legacy catalog in these tests.
    Sql $app "INSERT dbo.Users(LoginName,LoginNameNormalized) VALUES(N'ISOLATION',N'ISOLATION'); EXEC sp_rename 'dbo.RealtimeOutbox','RealtimeOutboxBroken'; EXEC sp_rename 'dbo.RealtimeDeliveryState','RealtimeDeliveryStateBroken'; UPDATE dbo.OrderSettings SET OverrideMode=N'OPEN',OverrideUntil=NULL" | Out-Null
    $isolationDate = [Yepas.Api.Data.IstanbulTimestamp]::FromUtc([DateTime](Sql $app 'SELECT GETUTCDATE()')).Date.AddDays(1)
    [ClosureWriteProbe]::Write($false,'NO_PRODUCT',$isolationDate)
    [ClosureWriteProbe]::Write($true,'NO_PRODUCT',$isolationDate)
    Check ((Sql $app 'SELECT COUNT(*) FROM dbo.OrderAudit') -eq 2) 'admin and customer writes succeed with broken notification tables'
    [ClosureWriteProbe]::SubmitUpdateCancel($false,$isolationDate)
    [ClosureWriteProbe]::SubmitUpdateCancel($true,$isolationDate)
    Check ((Sql $app 'SELECT COUNT(*) FROM dbo.OrderAudit') -eq 8) 'admin and customer product order create/update/cancel succeed with broken notification tables'
    $isolationRepo = New-Object Yepas.Api.Data.OrderRepository
    $null = $isolationRepo.UpdateSettings(1,1080,'OPEN',$null,$null)
    Check ((Sql $app 'SELECT COUNT(*) FROM dbo.OrderWindowAudit') -eq 1) 'settings write succeeds with broken notification tables'
    $isolationSync = New-Object Yepas.Api.Data.AtomicOrderDaySynchronizer
    $null = $isolationSync.Synchronize($null,$isolationDate,$false)
    Check ((Sql $app 'SELECT COUNT(*) FROM dbo.OrderFinalizations') -eq 1) 'export commits with broken notification tables'
    Sql $app "EXEC sp_rename 'dbo.RealtimeOutboxBroken','RealtimeOutbox'; EXEC sp_rename 'dbo.RealtimeDeliveryStateBroken','RealtimeDeliveryState'" | Out-Null
    $delivery = [Func[bool]] { return $true }
    $null = $drain.Invoke($null,@($delivery))
    Check ([Convert]::ToBase64String((Sql $app 'SELECT DeliveredFingerprint FROM dbo.RealtimeDeliveryState WHERE StateId=1')) -ne $latest) 'repaired notification metadata recovers committed changes without an enqueue'
    [Yepas.Api.Data.RealtimePublisher]::ConfigureForProcess('','')
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
        foreach ($invalid in @('123','12345','12a4', $(if ($role -eq 'ADMIN') { '0456' } else { 'StrongNewPassword!' }))) {
            $errorMessage = $null
            Check (-not $repo.ChangePassword($userId,$token,$oldPassword,$invalid,[ref]$errorMessage)) "$role rejects incompatible new password"
        }
        $newPassword = if ($role -eq 'DRIVER') { '04' } elseif ($role -eq 'CUSTOMER') { '0456' } else { 'StrongNewPassword!' }
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
