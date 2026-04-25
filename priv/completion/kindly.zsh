#compdef kindly
compdef _kindly kindly

zstyle ":completion:*:*:kindly:*" list-grouped false

_kindly() {
  local completions=()
  local x
  while IFS="" read -r x; do
    completions+="${x}"
  done < <(
    export COLUMNS

    local args=("${=words[2,CURRENT]}")

    kindly --cue zsh -- "${args[@]}" 2>/dev/null

    printf %s "${?}"
  )

  case "${x},${#completions}" in
    0,0) _arguments "*:filename:_files" ;;
    *,*) _describe -Vx "completions" completions ;;
  esac
}

case "${funcstack[1]}" in
  _kindly) _kindly ;;
esac
