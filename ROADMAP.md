# Roadmap

## Kindly `v1.0.0`

- [ ] Clean up API
  - [ ] Remove `theme`, `default_theme`, `plain_theme`, `gleam_theme`, `styler`
  - [ ] Consider removing `ansi`
  - [ ] Consider removing `get_env`, `set_env`, `unset_env`
  - [ ] Consider removing `is_terminal`
  - [ ] Consider removing `now`, `--time`
- [ ] Add `kindly --new` to `quickstart.md`
- [ ] Create docs for `examples.md`:
  - [ ] `just`/`command`
  - [ ] `step`/`command_step`
  - [ ] `group`
  - [ ] `map`
  - [ ] `task_with_tasks`
  - [ ] `midas`
- [ ] Add main demo image
- [ ] Add demo image generation in handbook
- [ ] Use `iv` array instead of list for `handbook.tasks`
- [ ] Tab completions should handle quotes
- [ ] Write `birdie` tests
- [ ] Refactor `string_width` code
- [ ] Consider `dev/handbook.gleam` vs `dev/project_dev.gleam`
- [ ] Generate demos as avif when `vhs` supports it
- [ ] Consider using `gleam_community/ansi`
- [ ] Consider extracting `kindly/set` to a dependency, with Erlang support
- [ ] Consider a lib for tab completion framework

## Kindly `>= v1.1.0`

- [ ] Add `--in` support for monorepos (review:
      [https://github.com/gleam-lang/gleam/discussions/3859](https://github.com/gleam-lang/gleam/discussions/3859))
- [ ] Add fuzzy matching support
- [ ] Add theme config support
- [ ] Make colour printing degrade gracefully
- [ ] error: project root directory is unreadable -> offer to try mkdir?
