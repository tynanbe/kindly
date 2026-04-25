Output ../images/bash-completion.gif

Set Shell bash
Set FontSize 24
Set Width 1380
Set Height 1200
Set Framerate 24
Set Theme "Catppuccin Mocha"
Set TypingSpeed 1ms

Hide
Type "source /etc/bash/bashrc || source /etc/bash_completion"
Enter
Type "clear; bash --version | awk -F'(' '{print $1; exit}'; echo"
Enter
Sleep 0.5
Show

Set TypingSpeed 75ms

Sleep 1
Type `eval "$(kindly --cue bash)"`
Sleep 1
Enter

Sleep 1
Type@0.05 "clear"
Sleep 1
Enter

Type "kindly "
Sleep 0.75

Tab 2
Sleep 2.5

Type "r"
Sleep 0.75
Tab
Sleep 1

Tab 2
Sleep 2
Enter

Sleep 15
Type@0.05 "clear"
Sleep 1
Enter
