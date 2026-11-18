# ==============================================================================
# Bayan Desktop Shortcut Creator
# Creates Windows Desktop and Start Menu shortcuts pointing to the live workspace
# ==============================================================================

$projectRoot = (Resolve-Path "$PSScriptRoot\..").Path
$electronExe = Join-Path $projectRoot "node_modules\electron\dist\electron.exe"
$mainJs = Join-Path $projectRoot "desktop\main.js"
$iconIco = Join-Path $projectRoot "desktop\assets\icon.ico"

$WshShell = New-Object -ComObject WScript.Shell

# 1. Desktop Shortcut
$desktopPath = [Environment]::GetFolderPath('Desktop')
$shortcutNames = @("بيان - Bayan.lnk", "Bayan.lnk")

foreach ($name in $shortcutNames) {
    $shortcutPath = Join-Path $desktopPath $name
    $shortcut = $WshShell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = $electronExe
    $shortcut.Arguments = "`"$mainJs`""
    $shortcut.WorkingDirectory = $projectRoot
    $shortcut.IconLocation = "$iconIco, 0"
    $shortcut.Description = "بيان — مساعد مؤسسي عربي ذكي (تطبيق سطح المكتب للتطوير المباشر)"
    $shortcut.Save()
    Write-Host "Created Desktop shortcut: $shortcutPath"
}

# 2. Start Menu Shortcut
$startMenuPath = [Environment]::GetFolderPath('Programs')
$startMenuShortcut = Join-Path $startMenuPath "بيان - Bayan.lnk"
$shortcut = $WshShell.CreateShortcut($startMenuShortcut)
$shortcut.TargetPath = $electronExe
$shortcut.Arguments = "`"$mainJs`""
$shortcut.WorkingDirectory = $projectRoot
$shortcut.IconLocation = "$iconIco, 0"
$shortcut.Description = "بيان — مساعد مؤسسي عربي ذكي (تطبيق سطح المكتب للتطوير المباشر)"
$shortcut.Save()
Write-Host "Created Start Menu shortcut: $startMenuShortcut"

# 3. Save workspace location config for relocation resilience
$workspaceConfig = @{
    projectRoot = $projectRoot
    electron = $electronExe
    main = $mainJs
    icon = $iconIco
    updatedAt = (Get-Date).ToString("o")
} | ConvertTo-Json -Depth 4

$configPath = Join-Path $projectRoot "desktop\workspace.json"
Set-Content -Path $configPath -Value $workspaceConfig -Encoding UTF8
Write-Host "Saved workspace configuration to: $configPath"

