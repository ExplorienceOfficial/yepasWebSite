param([string]$Server='lpc:.\YEPASDEV')
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Data
$root=Split-Path -Parent $PSScriptRoot
$scratch='Yepas_AccountsTest_'+[Guid]::NewGuid().ToString('N')
$master="Data Source=$Server;Initial Catalog=master;Integrated Security=True;Connect Timeout=5"
$app="Data Source=$Server;Initial Catalog=$scratch;Integrated Security=True;Connect Timeout=5"
function Sql([string]$cs,[string]$query) {
    $c=New-Object System.Data.SqlClient.SqlConnection $cs
    try { $c.Open(); $cmd=$c.CreateCommand(); $cmd.CommandText=$query; $cmd.CommandTimeout=30; return $cmd.ExecuteScalar() }
    finally { $c.Dispose() }
}
function Check([bool]$ok,[string]$name) { if (!$ok) { throw "FAILED: $name" }; Write-Host "PASS: $name" }
function Reject([scriptblock]$operation,[string]$name) { $failed=$false; try { & $operation } catch { $failed=$true }; Check $failed $name }
$created=$false
try {
    $null=Sql $master "CREATE DATABASE [$scratch]"; $created=$true
    Get-ChildItem (Join-Path $root 'database\migrations') -Filter '*.sql' | Where-Object {$_.Name -notlike '000*'} | Sort-Object Name | ForEach-Object {
        $source=[IO.File]::ReadAllText($_.FullName).Replace('EkmekSiparis',$scratch)
        foreach($batch in [regex]::Split($source,'(?im)^\s*GO\s*$')) { if($batch.Trim()) { $null=Sql $app $batch } }
    }
    $sources=@('RuntimeSettings.cs','Data\DatabaseConnections.cs','Data\AuthRepository.cs',
        'Domain\DriverAccountPolicy.cs','Domain\AccountNamePolicy.cs','Domain\OrderWindowPolicy.cs',
        'Data\CustomerManagementRepository.cs','Data\DriverManagementRepository.cs',
        'Data\LegacyCustomerScheduleReader.cs','Data\LegacyCustomerCatalogReader.cs',
        'Models\CustomerManagementModels.cs','Models\DriverManagementModels.cs')
    $units=@(); $usings=New-Object 'System.Collections.Generic.HashSet[string]'
    foreach($name in $sources) {
        $source=[IO.File]::ReadAllText((Join-Path $root ('server\Yepas.Api\'+$name)))
        foreach($match in [regex]::Matches($source,'(?m)^using [^\r\n]+;')) {$null=$usings.Add($match.Value)}
        $units += [regex]::Replace($source,'(?m)^using [^\r\n]+;\r?\n','')
    }
    Add-Type -ReferencedAssemblies 'System.Data.dll','System.Core.dll','System.Configuration.dll' -TypeDefinition (($usings -join "`n")+"`n"+($units -join "`n"))
    # All legacy fixtures live in the same GUID test database; no PrestoPlus writes.
    $null=Sql $app "CREATE SCHEMA D00013"
    $null=Sql $app @"
CREATE TABLE D00013.FIRMA_PERSONELI(PERSONEL_ID INT,PERSONEL_KODU NVARCHAR(20),PERSONEL_DURUM INT);
CREATE TABLE D00013.BF_PERS_MUST(PERSONEL_ID INT,MUSTERI_ID INT,BOLUM_ID INT);
CREATE TABLE D00013.RS_MUSTERI_BILGILERI(ID INT,MUSTERI_ID INT,BOLUM_ID INT,PERSONEL_ID INT,SS INT,
SG_1 CHAR(1),SG_2 CHAR(1),SG_3 CHAR(1),SG_4 CHAR(1),SG_5 CHAR(1),SG_6 CHAR(1),SG_7 CHAR(1));
INSERT D00013.FIRMA_PERSONELI VALUES(23,'D23',1);
INSERT D00013.BF_PERS_MUST VALUES(23,1,10);
INSERT D00013.RS_MUSTERI_BILGILERI VALUES(100,1,10,23,12,'+','+','+','+','+','+','+');
INSERT D00013.RS_MUSTERI_BILGILERI VALUES(101,1,11,23,12,'+','+','+','+','+','+','+');
INSERT D00013.RS_MUSTERI_BILGILERI VALUES(102,2,12,23,12,'+','+','+','+','+','+','+');
"@
    [Yepas.Api.Data.DatabaseConnections]::ConfigureForProcess($app,$app)
    $salt=New-Object byte[] 32
    $hash=[Yepas.Api.Data.AuthRepository]::HashPassword('StrongAdminPassword!',$salt,150000)
    $hex=[BitConverter]::ToString($hash).Replace('-','')
    $saltHex=[BitConverter]::ToString($salt).Replace('-','')
    $actor=Sql $app "INSERT dbo.Users(LoginName,LoginNameNormalized,PasswordHash,PasswordSalt,PasswordIterations,PasswordAlgorithm,IsActive,MustChangePassword) VALUES('admin','ADMIN',0x$hex,0x$saltHex,150000,'PBKDF2-SHA256',1,0); SELECT CAST(SCOPE_IDENTITY() AS INT);"
    $null=Sql $app "INSERT dbo.UserRoles VALUES($actor,'ADMIN')"
    $customers=New-Object Yepas.Api.Data.CustomerManagementRepository
    $drivers=New-Object Yepas.Api.Data.DriverManagementRepository
    $auth=New-Object Yepas.Api.Data.AuthRepository
    $ids=New-Object 'System.Collections.Generic.List[int]'; $ids.Add(100); $ids.Add(101)
    $customer=$customers.CreateAccount($actor,'0123456789','0123',$ids)
    Check ((Sql $app "SELECT COUNT(*) FROM dbo.CustomerAccess WHERE UserId=$($customer.UserId)") -eq 2) 'one customer account retains multiple branches'
    Check ((Sql $app "SELECT COUNT(*) FROM dbo.Users WHERE UserId=$($customer.UserId) AND TemporaryPasswordExpiresUtc IS NULL") -eq 1) 'customer PIN does not expire'
    Reject { $customers.ResetPassword($actor,$customer.UserId,'12') } 'customer rejects two-digit PIN'
    $driver=$drivers.CreateAccount($actor,23,'D23','01')
    Check (!$driver.MustChangePassword) 'driver create skips forced password change'
    Reject { $drivers.ResetPassword($actor,$driver.UserId,'0123') } 'driver rejects four-digit PIN'
    $null=Sql $app "UPDATE dbo.Users SET TemporaryPasswordExpiresUtc=DATEADD(day,-1,GETUTCDATE()) WHERE UserId IN ($($driver.UserId),$($customer.UserId))"
    $driverToken=$null; $customerToken=$null; $adminToken=$null
    $driverIdentity=$auth.Login('D23','01','DRIVER',[ref]$driverToken)
    $customerIdentity=$auth.Login('0123456789','0123','CUSTOMER',[ref]$customerToken)
    $adminIdentity=$auth.Login('admin','StrongAdminPassword!','ADMIN',[ref]$adminToken)
    Check ($driverIdentity -ne $null -and !$driverIdentity.MustChangePassword -and $customerIdentity -ne $null -and $adminIdentity -ne $null) 'role logins and removed PIN expiry rules work'
    Check ((Sql $app "SELECT COUNT(*) FROM dbo.AuthSessions WHERE RoleCode IN ('ADMIN','DRIVER') AND ExpiresAtUtc IS NULL") -eq 2) 'admin and driver sessions have no time expiry'
    Check ((Sql $app "SELECT COUNT(*) FROM dbo.AuthSessions WHERE RoleCode='CUSTOMER' AND ExpiresAtUtc IS NOT NULL") -eq 1) 'customer session policy stays bounded'
    $renamed='0123456789/'+[char]0x015E+'ube-1'
    $customers.UpdateLoginName($actor,$customer.UserId,$renamed)
    Check ($auth.Authenticate($customerToken,'CUSTOMER') -eq $null) 'rename revokes existing customer session'
    Check ((Sql $app "SELECT COUNT(*) FROM dbo.CustomerAccess WHERE UserId=$($customer.UserId)") -eq 2) 'rename preserves branch access'
    Check ((Sql $app "SELECT COUNT(*) FROM dbo.CustomerManagementAudit WHERE TargetUserId=$($customer.UserId) AND ActionCode='LOGIN_NAME_CHANGED'") -eq 2) 'rename records actor audit for each branch'
    Reject { $customers.UpdateLoginName($actor,$actor,'01234567890') } 'customer endpoint cannot rename admin'
    Reject { $customers.UpdateLoginName($actor,$customer.UserId,'bad name') } 'rename rejects malformed name'
    $ids2=New-Object 'System.Collections.Generic.List[int]'; $ids2.Add(102)
    $second=$customers.CreateAccount($actor,'9876543210','9999',$ids2)
    Reject { $customers.UpdateLoginName($actor,$second.UserId,$renamed) } 'rename rejects duplicate name'
    Reject { $customers.CreateAccount($actor,'1234567890','1111',$ids) } 'branch already linked is rejected'
    $mixed=New-Object 'System.Collections.Generic.List[int]'; $mixed.Add(100); $mixed.Add(102)
    Reject { $customers.CreateAccount($actor,'1234567890','1111',$mixed) } 'different customers cannot share an account'
    $drivers.ResetPassword($actor,$driver.UserId,'02')
    Check ($auth.Authenticate($driverToken,'DRIVER') -eq $null) 'driver reset revokes non-expiring session'
    $null=Sql $app "UPDATE dbo.Users SET MustChangePassword=1,TemporaryPasswordExpiresUtc=DATEADD(day,-1,GETUTCDATE()) WHERE UserId=$($driver.UserId)"
    $driverToken=$null
    Check ($auth.Login('D23','02','DRIVER',[ref]$driverToken) -ne $null) 'driver has no forced-change or expired PIN gate'
    $null=Sql $app 'DROP TABLE dbo.DriverAccounts'
    Check ($auth.Authenticate($adminToken,'ADMIN') -ne $null) 'broken driver table does not invalidate admin session'
    $customers.ResetPassword($actor,$second.UserId,'1234')
    $null=Sql $app "UPDATE dbo.Users SET MustChangePassword=0 WHERE UserId=$($second.UserId)"
    $token=$null
    foreach($i in 1..5) { $null=$auth.Login('9876543210','0000','CUSTOMER',[ref]$token) }
    Check ($auth.Login('9876543210','1234','CUSTOMER',[ref]$token) -eq $null) 'failed PIN attempts still enforce account lockout'
    $auth.Revoke($adminToken)
    Check ($auth.Authenticate($adminToken,'ADMIN') -eq $null) 'explicit logout revokes non-expiring admin session'
    $migration=[IO.File]::ReadAllText((Join-Path $root 'database\migrations\014_account_session_policy.sql')).Replace('EkmekSiparis',$scratch)
    $null=Sql $app $migration
    Check ((Sql $app 'SELECT COUNT(*) FROM dbo.SchemaMigrations WHERE VersionNumber=14') -eq 1) 'migration 014 is repeat-safe'
}
finally {
    if($created) {
        [System.Data.SqlClient.SqlConnection]::ClearAllPools()
        $null=Sql $master "ALTER DATABASE [$scratch] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [$scratch]"
    }
}
