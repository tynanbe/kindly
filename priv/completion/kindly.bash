complete -o default -F _kindly kindly

_kindly() {
  local cur
  local -i cword
  local -a words

  COMPREPLY=()
  if declare -F _init_completion >/dev/null 2>&1; then
    _init_completion -n =: || return
  else
    _get_comp_words_by_ref -n =: cur prev words cword || return
  fi

  local x
  while IFS="" read -r x; do
    COMPREPLY+=("${x}")
  done < <(
    export COLUMNS

    local args=("${words[@]:1:${cword}-1}")

    kindly --cue bash -- "${args[@]}" "${cur}" 2>/dev/null

    printf %s "${?}"
  )

  case "${x},$(type -t compopt)" in
    0,builtin) compopt -o nosort ;;
    *,builtin) compopt +o default ;;
  esac >/dev/null 2>&1
}
