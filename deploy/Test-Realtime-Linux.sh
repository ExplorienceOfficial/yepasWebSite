#!/usr/bin/env bash
set -euo pipefail
task_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
dotnet build "$task_root/server/Yepas.Realtime/Yepas.Realtime.csproj" -c Release --nologo
dotnet run --project "$task_root/server/Yepas.Realtime.Tests/Yepas.Realtime.Tests.csproj" -c Release -- \
  "$task_root/server/Yepas.Realtime/bin/Release/net10.0/Yepas.Realtime.dll"
