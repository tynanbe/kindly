complete -ec kindly

complete -c kindly -kxa "(__kindly_completions)"

complete -c kindly -Fn '
    set xs (__kindly_completions)
    and not count $xs'

function __kindly_completions
    set -lx COLUMNS $COLUMNS

    set -l args (commandline -cop)[2..]
    set -l current (commandline -ct)

    kindly --cue fish -- $args $current 2>/dev/null
end
