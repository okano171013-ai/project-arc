<#
.SYNOPSIS
  Starts Project ARC's local services (ARC Connector HTTP API, Remote
  MCP, ngrok tunnel). Version20, ADR 0047.

.DESCRIPTION
  Intended to run from Windows Task Scheduler at logon (see
  register-scheduled-tasks.ps1). Can also be run manually.

  Skips any service whose port is already listening (duplicate-start
  prevention). After ngrok starts, writes the current public URL to
  data/current-tunnel-url.txt (the free plan's URL changes on every
  restart, so this makes it easy to check — see ADR 0047).

  To stop everything, use stop-all.ps1, or end the node.exe / ngrok.exe
  processes via Task Manager.
#>

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$logDir = Join-Path $root 'data\logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

function Test-PortOpen {
    param([int]$Port)
    $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    return $null -ne $conn
}

function Wait-ForPort {
    param([int]$Port, [int]$TimeoutSeconds = 30)
    $elapsed = 0
    while (-not (Test-PortOpen -Port $Port)) {
        Start-Sleep -Seconds 1
        $elapsed++
        if ($elapsed -ge $TimeoutSeconds) {
            Write-Warning "Port $Port did not open within $TimeoutSeconds seconds"
            return $false
        }
    }
    return $true
}

# --- 1. ARC Connector HTTP API (default port 3939) ---
if (Test-PortOpen -Port 3939) {
    Write-Output "[start-all] port 3939 already listening, skipping pnpm run api"
} else {
    Write-Output "[start-all] starting pnpm run api"
    Start-Process -FilePath 'pnpm' -ArgumentList 'run', 'api' `
        -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $logDir 'api.out.log') `
        -RedirectStandardError (Join-Path $logDir 'api.err.log')
    Wait-ForPort -Port 3939 | Out-Null
}

# --- 2. Remote MCP server (default port 3940) ---
if (Test-PortOpen -Port 3940) {
    Write-Output "[start-all] port 3940 already listening, skipping pnpm run mcp:remote"
} else {
    Write-Output "[start-all] starting pnpm run mcp:remote"
    Start-Process -FilePath 'pnpm' -ArgumentList 'run', 'mcp:remote' `
        -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $logDir 'mcp-remote.out.log') `
        -RedirectStandardError (Join-Path $logDir 'mcp-remote.err.log')
    Wait-ForPort -Port 3940 | Out-Null
}

# --- 3. ngrok (exposes 3940) ---
# Treat ngrok as already running if its web interface (127.0.0.1:4040) responds.
$ngrokRunning = $false
try {
    Invoke-RestMethod -Uri 'http://127.0.0.1:4040/api/tunnels' -TimeoutSec 2 -ErrorAction Stop | Out-Null
    $ngrokRunning = $true
} catch {
    $ngrokRunning = $false
}

if ($ngrokRunning) {
    Write-Output "[start-all] ngrok already running, skipping"
} else {
    Write-Output "[start-all] starting ngrok http 3940"
    Start-Process -FilePath 'ngrok' -ArgumentList 'http', '3940' `
        -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $logDir 'ngrok.out.log') `
        -RedirectStandardError (Join-Path $logDir 'ngrok.err.log')
    Start-Sleep -Seconds 5
}

# --- 4. Record the current public URL to data/current-tunnel-url.txt ---
try {
    $tunnels = Invoke-RestMethod -Uri 'http://127.0.0.1:4040/api/tunnels' -TimeoutSec 5
    $publicUrl = $tunnels.tunnels | Select-Object -First 1 -ExpandProperty public_url
    if ($publicUrl) {
        $urlFile = Join-Path $root 'data\current-tunnel-url.txt'
        "$publicUrl/mcp" | Out-File -FilePath $urlFile -Encoding utf8 -NoNewline
        Write-Output "[start-all] current tunnel URL: $publicUrl/mcp (written to data\current-tunnel-url.txt)"
    } else {
        Write-Warning "[start-all] ngrok is running but no tunnel URL found yet"
    }
} catch {
    Write-Warning "[start-all] could not query ngrok web interface: $_"
}

Write-Output "[start-all] done"
