' ==============================================================================
' Bayan Enterprise AI Platform - Silent Desktop Launcher
' Launches Electron directly connected to the local workspace with ZERO console.
' ==============================================================================
Option Explicit

Dim fso, scriptDir, projectDir, wshShell, electronExe, mainJs, cmd

Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
projectDir = fso.GetParentFolderName(scriptDir)

Set wshShell = CreateObject("WScript.Shell")
wshShell.CurrentDirectory = projectDir

electronExe = projectDir & "\node_modules\electron\dist\electron.exe"
mainJs = projectDir & "\desktop\main.js"

If fso.FileExists(electronExe) Then
    cmd = """" & electronExe & """ """ & mainJs & """"
Else
    cmd = "cmd.exe /c npx electron """ & mainJs & """"
End If

' 0 = Hide window (SW_HIDE), False = Do not wait for completion
wshShell.Run cmd, 0, False

