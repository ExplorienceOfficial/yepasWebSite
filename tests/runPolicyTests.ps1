$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
[Reflection.Assembly]::LoadFrom((Join-Path $root 'server\packages\Newtonsoft.Json.13.0.1\lib\net45\Newtonsoft.Json.dll')) | Out-Null
[xml]$project = Get-Content (Join-Path $root 'server\Yepas.PolicyTests\Yepas.PolicyTests.csproj')
$paths = @($project.Project.ItemGroup.Compile | Where-Object { $_.Include } | ForEach-Object {
    Join-Path (Join-Path $root 'server\Yepas.PolicyTests') $_.Include
})
$types = @(Add-Type -PassThru -Path $paths -ReferencedAssemblies 'System.Core.dll',(Join-Path $root 'server\packages\Newtonsoft.Json.13.0.1\lib\net45\Newtonsoft.Json.dll'))
$type = $types[0].Assembly.GetType('Yepas.PolicyTests.Program', $true)
$main = $type.GetMethod('Main', [Reflection.BindingFlags]'NonPublic,Static')
$null = $main.Invoke($null, @())
