Output ../images/pwsh-completion.gif

Set Shell pwsh
Set FontSize 24
Set Width 1380
Set Height 1200
Set Framerate 24
Set Theme "Catppuccin Mocha"
Set TypingSpeed 1ms

Hide
Type "Set-PSReadlineKeyHandler -Key Tab -Function MenuComplete"
Enter
Type "$Colors = @{}"
Enter
Type '$Colors["Command"] = "DarkBlue"'
Enter
Type '$Colors["Comment"] = "`e[3;90m"'
Enter
Type '$Colors["ContinuationPrompt"] = "DarkGray"'
Enter
Type '$Colors["Default"] = "Gray"'
Enter
Type '$Colors["Emphasis"] = "Cyan"'
Enter
Type '$Colors["Error"] = "`e[1;91m"'
Enter
Type '$Colors["InlinePrediction"] = "`e[1;3;90m"'
Enter
Type '$Colors["Keyword"] = "`e[3;35m"'
Enter
Type '$Colors["ListPrediction"] = "`e[1;2;37m"'
Enter
Type '$Colors["ListPredictionSelected"] = "`e[100m"'
Enter
Type '$Colors["Member"] = "Gray"'
Enter
Type '$Colors["Number"] = "DarkRed"'
Enter
Type '$Colors["Operator"] = "DarkCyan"'
Enter
Type '$Colors["Parameter"] = "Yellow"'
Enter
Type '$Colors["Selection"] = "`e[100m"'
Enter
Type '$Colors["String"] = "DarkGreen"'
Enter
Type '$Colors["Variable"] = "DarkCyan"'
Enter
Type "Set-PSReadLineOption -Colors $Colors -PredictionSource None"
Enter
# Greeting
Type "Clear-Host; pwsh -Version; Write-Host"
Enter
Sleep 0.5
Show

Set TypingSpeed 75ms

Sleep 1
Type "kindly --cue pwsh | Out-String | Invoke-Expression"
Sleep 1
Enter

Sleep 1
Type@0.05 "Clear-Host"
Sleep 1
Enter

Type "kindly "
Sleep 0.75

Tab
Sleep 2.5

Enter
Type " "
Sleep 1

Tab
Sleep 2
Escape
Enter

Sleep 15
Type@0.05 "Clear-Host"
Sleep 1
Enter
