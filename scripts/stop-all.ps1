<#
.SYNOPSIS
  Stops the local services started by start-all.ps1. Version20, ADR 0047.

.DESCRIPTION
  Identifies the process listening on each relevant port (3939 = ARC
  Connector HTTP API, 3940 = Remote MCP, 4040 = ngrok web interface)
  and stops only that specific PID — never a broad kill-by-name sweep,
  to avoid terminating unrelated node.exe processes.
#>

$ErrorActionPreference = 'Continue'

function Stop-ByPort {
    param([int]$Port, [string]$Label)
    $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if (-not $conns) {
        Write-Output "[stop-all] $Label (port $Port): not running"
        return
    }
    foreach ($conn in $conns) {
        $ownerPid = $conn.OwningProcess
        try {
            Stop-Process -Id $ownerPid -Force -ErrorAction Stop
            Write-Output "[stop-all] $Label (port $Port): stopped pid $ownerPid"
        } catch {
            Write-Warning "[stop-all] $Label (port $Port): failed to stop pid $ownerPid - $_"
        }
    }
}

Stop-ByPort -Port 3940 -Label 'Remote MCP'
Stop-ByPort -Port 3939 -Label 'ARC Connector HTTP API'
Stop-ByPort -Port 4040 -Label 'ngrok web interface'

Write-Output "[stop-all] done"
