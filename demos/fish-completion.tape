Output ../images/fish-completion.gif

Set Shell fish
Set FontSize 24
Set Width 1380
Set Height 1200
Set Framerate 24
Set Theme "Catppuccin Mocha"
Set TypingSpeed 1ms

Hide
Type "set -g fish_autosuggestion_enabled 0"
Enter
# Syntax
Type "set -g fish_color_command blue"
Enter
Type "set -g fish_color_comment brblack --italics"
Enter
Type "set -g fish_color_end cyan"
Enter
Type "set -g fish_color_escape cyan"
Enter
Type "set -g fish_color_keyword magenta --italics"
Enter
Type "set -g fish_color_operator cyan"
Enter
Type "set -g fish_color_option bryellow"
Enter
Type "set -g fish_color_param green"
Enter
Type "set -g fish_color_quote green"
Enter
Type "set -g fish_color_redirection cyan"
Enter
Type "set -g fish_color_search_match --background=brblack"
Enter
Type "set -g fish_color_selection --background=brblack"
Enter
# Pager
Type "set -g fish_pager_color_description --bold --dim --italics"
Enter
Type "set -g fish_pager_color_prefix --bold"
Enter
Type "set -g fish_pager_color_progress brblack --bold --italics"
Enter
Type "set -g fish_pager_color_selected_background --background=brblack"
Enter
Type "set -g fish_pager_color_selected_completion white"
Enter
Type "set -g fish_pager_color_selected_description --bold --italics"
Enter
# Greeting
Type "clear; fish --version; echo"
Enter
Sleep 0.5
Show

Set TypingSpeed 75ms

Sleep 1
Type "kindly --cue fish | source"
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
