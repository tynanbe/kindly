Output ../images/zsh-completion.gif

Set Shell zsh
Set FontSize 24
Set Width 1380
Set Height 1200
Set Framerate 24
Set Theme "Catppuccin Mocha"
Set TypingSpeed 1ms

Hide
Type "zstyle ':completion:*' completer _complete _ignored _approximate"
Enter
Type "zstyle ':completion:*' insert-unambiguous true"
Enter
Type "zstyle ':completion:*' list-colors ${(s.:.)LS_COLORS}"
Enter
Type "zstyle ':completion:*' matcher-list 'm:{[:lower:][:upper:]}={[:upper:][:lower:]}'"
Enter
Type "zstyle ':completion:*' max-errors 3"
Enter
Type "zstyle ':completion:*' menu select=1"
Enter
Type "zstyle ':completion:*' select-prompt %Srow %l%s"
Enter
Type "autoload -Uz compinit"
Enter
Type "setopt extendedglob notify"
Enter
Type "unsetopt autocd beep nomatch"
Enter
Type "zstyle ':completion:*' squeeze-slashes true"
Enter
Type `compinit -d "$(mktemp)"`
Enter
# Greeting
Type "clear; zsh --version | awk -F'(' '{print $1}'; echo"
Enter
Sleep 0.5
Show

Set TypingSpeed 75ms

Sleep 1
Type `eval "$(kindly --cue zsh)"`
Sleep 1
Enter

Sleep 1
Type@0.05 "clear"
Sleep 1
Enter

Type "kindly "
Sleep 0.75

Tab
Sleep 2.5

Tab
Sleep 1
Enter

Tab
Sleep 2
Enter

Sleep 15
Type@0.05 "clear"
Sleep 1
Enter
