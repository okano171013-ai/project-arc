<#
.SYNOPSIS
  Registers Project ARC's resident operation (boot-time auto-start,
  Collaboration Runner) with Windows Task Scheduler. Version20, ADR 0047.

.DESCRIPTION
  No administrator rights required — registers as the current user with
  a logon trigger (Register-ScheduledTask, ScheduledTasks module).

  Registers four tasks:
    1. ProjectARC-AutoStart: runs start-all.ps1 at logon
       (starts pnpm run api / mcp:remote / ngrok / mobile-ingress)
    2. ProjectARC-CollaborationRunner: runs pnpm run runner every 15
       minutes (mechanically detects new AgentMessage/ManagementFeedback
       only, ADR 0046)
    3. ProjectARC-CheckInPrompter: runs pnpm run checkin-runner every
       2 hours (決定的ルールエンジンによるIntervention生成のみ、
       Version26、ADR 0053) — 新規タスク。他の2つと違い、外部ネットワーク
       アクセスを一切行わないローカル専用スクリプトを起動する
       （`GenerateInterventionsUseCase`を直接importして呼ぶ設計のため）。
    4. ProjectARC-MobileSync: runs pnpm mobile-sync every 15 minutes
       （Version36）——Mobile Ingressが受信したAccepted状態の
       IngressRecordをPC起動中に自動でCanonicalizeする「Sync Worker」
       の定期実行。ネットワーク受信は行わない（ローカルJSON→ローカル
       JSONの反映のみ）。

  All tasks use -MultipleInstances IgnoreNew (don't start a new run if
  one is already in progress — duplicate-execution prevention) and
  -StartWhenAvailable (still runs after a missed logon / reboot
  recovery).

.NOTES
  To disable:
    Disable-ScheduledTask -TaskName 'ProjectARC-AutoStart'
    Disable-ScheduledTask -TaskName 'ProjectARC-CollaborationRunner'
    Disable-ScheduledTask -TaskName 'ProjectARC-CheckInPrompter'
    Disable-ScheduledTask -TaskName 'ProjectARC-MobileSync'
  To remove entirely:
    Unregister-ScheduledTask -TaskName 'ProjectARC-AutoStart' -Confirm:$false
    Unregister-ScheduledTask -TaskName 'ProjectARC-CollaborationRunner' -Confirm:$false
    Unregister-ScheduledTask -TaskName 'ProjectARC-CheckInPrompter' -Confirm:$false
    Unregister-ScheduledTask -TaskName 'ProjectARC-MobileSync' -Confirm:$false
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

# --- 3. ProjectARC-CheckInPrompter (every 2 hours) ---
# Version26、ADR 0053。GenerateInterventionsUseCase（決定的ルール
# エンジン）を直接importして呼ぶローカル専用スクリプト——ネットワーク
# 経由の書き込み可能エンドポイントは一切追加しない。
$checkInAction = New-ScheduledTaskAction -Execute 'powershell.exe' `
    -Argument "-NoProfile -ExecutionPolicy Bypass -Command `"Set-Location -LiteralPath '$root'; pnpm run checkin-runner`""
$checkInTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date) `
    -RepetitionInterval (New-TimeSpan -Minutes 120) `
    -RepetitionDuration (New-TimeSpan -Days 3650)
$checkInSettings = New-ScheduledTaskSettingsSet `
    -MultipleInstances IgnoreNew `
    -StartWhenAvailable

Register-ScheduledTask -TaskName 'ProjectARC-CheckInPrompter' `
    -Action $checkInAction -Trigger $checkInTrigger -Settings $checkInSettings `
    -Description 'Project ARC: runs the Check-In Prompter every 2 hours, deterministic rule-based intervention generation only (Version26, ADR 0053)' `
    -Force | Out-Null
Write-Output "[register] ProjectARC-CheckInPrompter registered"

# --- 4. ProjectARC-MobileSync (every 15 minutes) ---
# Version36、ADR 0064・0065。Mobile Ingressが受信したAccepted状態の
# IngressRecordを、PC起動中にlocalへCanonicalizeする「Sync Worker」の
# 定期実行。既存のCollaboration Runnerと同じ15分間隔・IgnoreNew設計。
$mobileSyncAction = New-ScheduledTaskAction -Execute 'powershell.exe' `
    -Argument "-NoProfile -ExecutionPolicy Bypass -Command `"Set-Location -LiteralPath '$root'; pnpm mobile-sync`""
$mobileSyncTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date) `
    -RepetitionInterval (New-TimeSpan -Minutes 15) `
    -RepetitionDuration (New-TimeSpan -Days 3650)
$mobileSyncSettings = New-ScheduledTaskSettingsSet `
    -MultipleInstances IgnoreNew `
    -StartWhenAvailable

Register-ScheduledTask -TaskName 'ProjectARC-MobileSync' `
    -Action $mobileSyncAction -Trigger $mobileSyncTrigger -Settings $mobileSyncSettings `
    -Description 'Project ARC: runs pnpm mobile-sync every 15 min, Canonicalizes Accepted IngressRecords while the PC is on (Version36, ADR 0064/0065)' `
    -Force | Out-Null
Write-Output "[register] ProjectARC-MobileSync registered"

Write-Output "[register] done. Verify with: Get-ScheduledTask -TaskName 'ProjectARC-*'"
