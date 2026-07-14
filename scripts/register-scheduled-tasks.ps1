<#
.SYNOPSIS
  Registers Project ARC's resident operation (boot-time auto-start,
  Collaboration Runner) with Windows Task Scheduler. Version20, ADR 0047.

.DESCRIPTION
  No administrator rights required — registers as the current user with
  a logon trigger (Register-ScheduledTask, ScheduledTasks module).

  Registers two tasks:
    1. ProjectARC-AutoStart: runs start-all.ps1 at logon
       (starts pnpm run api / mcp:remote / ngrok)
    2. ProjectARC-CollaborationRunner: runs pnpm run runner every 15
       minutes (mechanically detects new AgentMessage/ManagementFeedback
       only, ADR 0046)

  Both tasks use -MultipleInstances IgnoreNew (don't start a new run if
  one is already in progress — duplicate-execution prevention) and
  -StartWhenAvailable (still runs after a missed logon / reboot
  recovery).

.NOTES
  To disable:
    Disable-ScheduledTask -TaskName 'ProjectARC-AutoStart'
    Disable-ScheduledTask -TaskName 'ProjectARC-CollaborationRunner'
  To remove entirely:
    Unregister-ScheduledTask -TaskName 'ProjectARC-AutoStart' -Confirm:$false
    Unregister-ScheduledTask -TaskName 'ProjectARC-CollaborationRunner' -Confirm:$false
#>

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$startAllPath = Join-Path $root 'scripts\start-all.ps1'

# --- 1. ProjectARC-AutoStart (at logon) ---
$autoStartAction = New-ScheduledTaskAction -Execute 'powershell.exe' `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$startAllPath`""
$autoStartTrigger = New-ScheduledTaskTrigger -AtLogOn
$autoStartSettings = New-ScheduledTaskSettingsSet `
    -MultipleInstances IgnoreNew `
    -StartWhenAvailable

Register-ScheduledTask -TaskName 'ProjectARC-AutoStart' `
    -Action $autoStartAction -Trigger $autoStartTrigger -Settings $autoStartSettings `
    -Description 'Project ARC: starts pnpm run api / mcp:remote / ngrok at logon (Version20, ADR 0047)' `
    -Force | Out-Null
Write-Output "[register] ProjectARC-AutoStart registered"

# --- 2. ProjectARC-CollaborationRunner (every 15 minutes) ---
$runnerAction = New-ScheduledTaskAction -Execute 'powershell.exe' `
    -Argument "-NoProfile -ExecutionPolicy Bypass -Command `"Set-Location -LiteralPath '$root'; pnpm run runner`""
$runnerTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date) `
    -RepetitionInterval (New-TimeSpan -Minutes 15) `
    -RepetitionDuration (New-TimeSpan -Days 3650)
$runnerSettings = New-ScheduledTaskSettingsSet `
    -MultipleInstances IgnoreNew `
    -StartWhenAvailable

Register-ScheduledTask -TaskName 'ProjectARC-CollaborationRunner' `
    -Action $runnerAction -Trigger $runnerTrigger -Settings $runnerSettings `
    -Description 'Project ARC: runs the Collaboration Runner every 15 min, mechanical new-item detection only (Version20, ADR 0046)' `
    -Force | Out-Null
Write-Output "[register] ProjectARC-CollaborationRunner registered"

Write-Output "[register] done. Verify with: Get-ScheduledTask -TaskName 'ProjectARC-*'"
