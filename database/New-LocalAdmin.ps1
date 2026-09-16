param(
    [Parameter(Mandatory = $true)]
    [ValidateLength(3, 100)]
    [string]$LoginName,

    [switch]$PromptConnectionString
)

$ErrorActionPreference = 'Stop'
$first = Read-Host 'Yeni admin parolası (en az 12 karakter)' -AsSecureString
$second = Read-Host 'Parolayı tekrar girin' -AsSecureString
$firstPtr = [IntPtr]::Zero
$secondPtr = [IntPtr]::Zero
$connectionPtr = [IntPtr]::Zero

try {
    $firstPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($first)
    $secondPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($second)
    $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($firstPtr)
    $confirmation = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secondPtr)
    if ($password.Length -lt 12) { throw 'Parola en az 12 karakter olmalı.' }
    if ($password -cne $confirmation) { throw 'Parolalar eşleşmiyor.' }

    $salt = New-Object byte[] 32
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($salt) } finally { $rng.Dispose() }
    $deriveType = [Security.Cryptography.Rfc2898DeriveBytes]
    $hashAlgorithmType = [Security.Cryptography.HashAlgorithmName]
    $constructor = $deriveType.GetConstructor([Type[]]@(
        [String], [Byte[]], [Int32], $hashAlgorithmType))
    if ($constructor -eq $null) { throw '.NET Framework 4.8 PBKDF2-SHA256 desteği bulunamadı.' }
    $derive = $constructor.Invoke([Object[]]@(
        $password, $salt, 150000, [Security.Cryptography.HashAlgorithmName]::SHA256))
    try { $hash = $derive.GetBytes(32) } finally { $derive.Dispose() }

    $connectionString = 'Server=.\YEPASDEV;Database=EkmekSiparis;Integrated Security=SSPI;Encrypt=False;Application Name=YepasLocalAdminSetup'
    if ($PromptConnectionString) {
        $connectionSecret = Read-Host 'EkmekSiparis bağlantı dizesi' -AsSecureString
        $connectionPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($connectionSecret)
        $connectionString = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($connectionPtr)
        if ([String]::IsNullOrWhiteSpace($connectionString)) { throw 'Bağlantı dizesi boş olamaz.' }
    }

    $connection = New-Object System.Data.SqlClient.SqlConnection($connectionString)
    try {
        $connection.Open()
        $transaction = $connection.BeginTransaction()
        try {
            $command = $connection.CreateCommand()
            $command.Transaction = $transaction
            $command.CommandText = @'
INSERT INTO dbo.Users
    (LoginName, LoginNameNormalized, PasswordHash, PasswordSalt,
     PasswordIterations, PasswordAlgorithm, IsActive, MustChangePassword)
VALUES (@name, @normalized, @hash, @salt,
        150000, N'PBKDF2-SHA256', 1, 0);
DECLARE @id INT;
SET @id = CAST(SCOPE_IDENTITY() AS INT);
INSERT INTO dbo.UserRoles (UserId, RoleCode) VALUES (@id, N'ADMIN');
'@
            [void]$command.Parameters.Add('@name', [System.Data.SqlDbType]::NVarChar, 100)
            [void]$command.Parameters.Add('@normalized', [System.Data.SqlDbType]::NVarChar, 100)
            [void]$command.Parameters.Add('@hash', [System.Data.SqlDbType]::VarBinary, 32)
            [void]$command.Parameters.Add('@salt', [System.Data.SqlDbType]::VarBinary, 32)
            $command.Parameters['@name'].Value = $LoginName.Trim()
            $command.Parameters['@normalized'].Value = $LoginName.Trim().ToUpperInvariant()
            $command.Parameters['@hash'].Value = $hash
            $command.Parameters['@salt'].Value = $salt
            [void]$command.ExecuteNonQuery()
            $transaction.Commit()
            Write-Host 'Admin hesabı oluşturuldu. Parola yalnızca özetiyle saklandı.'
        }
        catch {
            $transaction.Rollback()
            throw
        }
    }
    finally { $connection.Close() }
}
finally {
    if ($firstPtr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($firstPtr) }
    if ($secondPtr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secondPtr) }
    if ($connectionPtr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($connectionPtr) }
    $connectionString = $null
}
