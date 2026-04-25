//// Provides Kindly's main API for defining, selecting, and running project
//// tasks through a `Handbook`.
////
//// When run as an app, Kindly finds the current project's `Handbook`, or
//// interactively offers to create a new one, and runs selected tasks from it.
////

import gleam/bool
import gleam/dict
import gleam/int
import gleam/io
import gleam/javascript/promise
import gleam/list
import gleam/option.{type Option, None, Some}
import gleam/order.{Gt, Lt}
import gleam/result
import gleam/string
import kindly/set.{type Set}
import string_width

// ⬤ •╱ *╱.
//  ˙ ‧╱╱  
// ╱╲*.·   
//   ╲╱╲   
//  ꟸ ╲ ╲ Configuration
// .˙‧∴.˙∵‧
// Ψ˙ ≁ ˙  
//   ↀ ʽ ⍦ 
// ⍭  ’ ‚  
//   ‟╷│   
// ’  ╰┼╯ „
//  ‟      

// Static arguments

const end_flag_doc = "Pass further arguments to all selected tasks"

const help_flag_doc = "Print help information"

const new_flag_doc = "Make a new handbook"

const cue_flag_doc = "Print shell completions"

const handbook_flags = [
  #("--    ", end_flag_doc),

  #("--any ", "Filter tasks for any of the following tags"),

  #("--help", help_flag_doc),

  #("--time", "Print time elapsed"),

  #("--new ", new_flag_doc),

  #("--cue ", cue_flag_doc),
]

const blank_handbook_flags = [
  #("--help", help_flag_doc),

  #("--new ", new_flag_doc),

  #("--cue ", cue_flag_doc),
]

const cue_flags = [
  #("--    ", "Print completions for further arguments"),

  #("--help", "Print help information for completions"),
]

const cue_shells = [
  #("bash", "Print a bash completion script"),

  #("fish", "Print a fish completion script"),

  #("pwsh", "Print a pwsh completion script"),

  #("zsh ", "Print a zsh completion script"),
]

// Formatting

const nbsp = "\u{a0}"

const is_that_ok_ = " Is" <> nbsp <> "that" <> nbsp <> "OK?"

/// The default line width after which Kindly wraps words to the next line.
///
/// Can be overridden with the environment variable `KINDLY_MAX_WIDTH`.
///
const max_width = 64

/// Minimum terminal width Kindly attempts to support when formatting output.
///
const min_width = 16

/// Smallest tab allowed.
///
const min_tab = "  "

// ANSI codes

const bold = 1

const dim = 2

const italic = 3

const underline = 4

// ⬤ •╱ *╱.
//  ˙ ‧╱╱  
// ╱╲*.·   
//   ╲╱╲   
//  ꟸ ╲ ╲ Application
// .˙‧∴.˙∵‧
// Ψ˙ ≁ ˙  
//   ↀ ʽ ⍦ 
// ⍭  ’ ‚  
//   ‟╷│   
// ’  ╰┼╯ „
//  ‟      

/// A JavaScript `Promise`, re-exported from `gleam_javascript` for convenience.
///
/// For further information view the [MDN documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise).
///
pub type Promise(a) =
  promise.Promise(a)

/// A type that never returns.
///
@external(javascript, "./kindly_ffi.ts", "Never")
pub type Never

/// Finds a `Handbook` or interactively tries to write a new one.
///
@internal
pub fn main() -> Promise(Never) {
  use Args(cue:, help:, new:, ..) as args <- exit_unless(
    is_ok: args() |> parse_args(from: None) |> promise.resolve,
  )

  let can_interact = [Stdin, Stdout, Stderr] |> list.all(is_terminal)
  let print_info = fn() {
    info(apply: default_theme()) |> string.join(with: "\n") |> io.println
  }

  use <- bool.lazy_guard(when: new, return: fn() {
    // TODO: --new --help
    let _ = help
    case can_interact {
      True -> {
        print_info()
        use result <- promise.await(do_new())
        exit(code: case result {
          Ok(_) -> 0
          _else -> 1
        })
      }
      False -> {
        "`--new` needs a terminal for `stdin`, `stdout`, and `stderr`"
        |> print_error
        exit(code: 1)
      }
    }
  })

  case get_handbook() {
    Ok(run_handbook) -> run_handbook()

    _ if cue != None ->
      exit(code: case run_cue(with: args, from: "blank" |> handbook) {
        Ok(_) -> 0
        _else -> 1
      })

    _ if help -> {
      let theme = default_theme()
      [
        info(apply: theme),
        [""],
        usage(with: "", apply: theme),
        [""],
        flags(with: blank_handbook_flags, apply: theme),
      ]
      |> list.flatten
      |> string.join(with: "\n")
      |> io.println
      exit(code: 0)
    }

    _ if can_interact -> {
      print_info()
      use should_write_handbook <- exit_unless(
        is_ok: {
          "It looks like you’ll need to make a new handbook." <> is_that_ok_
        }
        |> get_bool(or: True),
      )
      use <- bool.lazy_guard(when: not_(should_write_handbook), return: fn() {
        { "\n" <> "No worries. Farewell~" |> wrap_line(with: "") }
        |> io.println
        exit(code: 0)
      })
      use result <- promise.await(do_new())
      exit(code: case result {
        Ok(_) -> 0
        _else -> 1
      })
    }

    _else -> {
      "no handbook to run" |> print_error
      exit(code: 1)
    }
  }
}

/// A type for holding info about the arguments given to the program.
///
type Args {
  Args(
    // Primary fields
    cue: Option(Option(String)),
    help: Bool,
    new: Bool,
    time: Bool,
    all_tags: Set(String),
    any_tags: Set(String),
    action_args: List(String),
    // Secondary fields
    has_tags: Bool,
    has_any: Bool,
    has_end: Bool,
    errors: Set(String),
  )
}

/// Returns `Args` based on the `List` of arguments given when invoking the
/// program.
///
/// Everything before the `--` flag is treated as Kindly tags or flags.
///
/// Everything after the `--` flag is treated as arguments to pass along to all
/// selected tasks.
///
/// Tags are grouped by whether they come before or after the `--any` flag.
///
fn parse_args(
  args: List(String),
  from handbook: Option(Handbook),
) -> Result(Args, Nil) {
  // TODO: mv to validate_handbook fn?
  let #(tags, tag_errors, doc_errors) = case handbook {
    Some(Handbook(tasks:, ..)) -> {
      use #(tags, tag_errors, doc_errors), task <- list.fold(
        over: tasks,
        from: #(Some(set.new()), set.new(), 0),
      )
      let tags = tags |> option.map(with: set.union(of: _, and: task.tags))
      let tag_errors = {
        use tag_errors, tag <- list.fold(
          over: task.tags |> set.to_list,
          from: tag_errors,
        )
        case not_(tag |> tag_is_valid) {
          True -> tag_errors |> set.insert(tag)
          False -> tag_errors
        }
      }
      let doc_errors = case
        task.doc |> string.contains("\n") || task.doc |> string.contains("\r")
      {
        True -> doc_errors + 1
        False -> doc_errors
      }
      #(tags, tag_errors, doc_errors)
    }

    None -> #(None, set.new(), 0)
  }

  let errors =
    [
      case tag_errors |> set.to_list {
        [] -> []
        tag_errors -> [
          [
            "handbook tags can’t start with `-`, contain blank space, or be empty",
            "choose different tags for: "
              <> {
              tag_errors
              |> list.map(with: fn(x) { "`" <> x <> "`" })
              |> string.join(with: ", ")
            },
          ],
        ]
      },
      case doc_errors {
        0 -> []
        x -> [
          [
            "handbook docs can’t contain `\\n` or `\\r`",
            "revise docs for " <> int.to_string(x) <> " of your tasks",
          ],
        ]
      },
    ]
    |> list.flatten
    |> list.map(with: string.join(_, with: "\n"))

  case errors {
    [] ->
      Args(
        // Primary fields
        cue: None,
        help: False,
        new: False,
        time: False,
        all_tags: set.new(),
        any_tags: set.new(),
        action_args: [],
        // Secondary fields
        has_tags: False,
        has_any: False,
        has_end: False,
        errors: set.new(),
      )
      |> parse_args_loop(with: args, compared_to: tags)

    _else -> errors |> list.each(print_error) |> Error
  }
}

fn parse_args_loop(
  acc: Args,
  with args: List(String),
  compared_to tags: Option(Set(String)),
) -> Result(Args, Nil) {
  let Args(all_tags:, any_tags:, has_any:, has_end:, ..) = acc

  case args {
    [_, ..] if has_end ->
      // Take remaining args
      Args(..acc, action_args: args)
      |> parse_args_loop(with: [], compared_to: tags)

    ["--cue", ..args] ->
      case args {
        [] | ["-" <> _, ..] ->
          Args(..acc, cue: Some(None))
          |> parse_args_loop(with: args, compared_to: tags)

        [arg, ..args] ->
          Args(..acc, cue: Some(Some(arg)))
          |> parse_args_loop(with: args, compared_to: tags)
      }

    [arg, ..args] ->
      case arg {
        "--" -> Args(..acc, has_end: True)

        "--any" -> Args(..acc, has_any: True)

        "--cue=" <> arg -> Args(..acc, cue: Some(Some(arg)))

        "--help" -> Args(..acc, help: True)

        "--new" -> Args(..acc, new: True)

        "--time" -> Args(..acc, time: True)

        tag -> {
          let error = fn(message) {
            let message = "tag `" <> tag <> "` " <> message
            Args(..acc, errors: acc.errors |> set.insert(message))
          }
          // TODO: replace with unknown_flag verbiage?
          let invalid_tag = not_(tag |> tag_is_valid)
          let missing_tag = case tags {
            Some(tags) -> not_(tags |> set.contains(tag))
            None -> False
          }
          let acc = case tag {
            _ if invalid_tag ->
              "can’t start with `-`, contain blank space, or be empty"
              |> error
            _ if missing_tag -> "isn’t in your handbook" |> error
            _else -> acc
          }
          case tag {
            tag if has_any ->
              Args(..acc, any_tags: any_tags |> set.insert(tag), has_tags: True)
            tag ->
              Args(..acc, all_tags: all_tags |> set.insert(tag), has_tags: True)
          }
        }
      }
      |> parse_args_loop(with: args, compared_to: tags)

    // Done
    [] -> acc |> validate_args
  }
}

/// Results in the given `Args` if no conflicting arguments are present, or
/// `Nil` on failure, after printing all found errors.
///
fn validate_args(args: Args) -> Result(Args, Nil) {
  let Args(cue:, help:, new:, time:, action_args:, ..) = args
  let Args(has_tags:, has_any:, has_end:, errors:, ..) = args
  let errors = errors |> set.to_list

  let errors =
    [
      case cue {
        Some(_) if has_tags || has_any || new || time -> [
          "can’t run `--cue` with other flags or tags",
        ]
        Some(None) if !help && !has_end -> [
          "can’t run `--cue` without any arguments",
        ]
        _else -> []
      },

      case cue {
        Some(Some(x))
          if x != "bash" && x != "fish" && x != "pwsh" && x != "zsh"
        -> {
          let shells = "`bash`, `fish`, `pwsh`, or `zsh`"
          ["can’t run `--cue` for `" <> x <> "`, try " <> shells]
        }
        _else -> []
      },

      case new {
        // TODO: brackets aren't needed, but Gleam v1.14.0 generates faulty JS otherwise
        True
          if { has_tags || has_any || cue != None || time || action_args != [] }
        -> ["can’t run `--new` with other arguments"]
        _else -> []
      },

      errors,
    ]
    |> list.flatten

  case errors {
    [] -> args |> Ok
    _else -> errors |> list.each(print_error) |> Error
  }
}

/// A starter handbook module for Gleam.
///
const gleam_handbook = "import kindly.{type Handbook, task}

pub fn main() -> Handbook {
  kindly.handbook(for: \"{{project}}\")
  |> task(
    doc: \"Print a greeting\",
    tags: [\"hi\"],
    action: kindly.just(run: \"echo\", with: [\"Welcome to your new handbook!\"]),
  )
}
"

/// A starter handbook module for JavaScript.
///
const javascript_handbook = "import kindly from \"{{module}}\";

export default kindly.handbook({ for: \"{{project}}\" })
  .task({
    doc: \"Print a greeting\",
    tags: [\"hi\"],
    action: kindly.just(\"echo\", \"Welcome to your new handbook!\"),
  });
"

/// Results in the path to a new starter handbook module. Fails if the file
/// can't be written.
///
fn do_new() -> Promise(Result(Nil, Nil)) {
  let dir = project_root()
  let print_error = fn(message) {
    "" |> io.println_error
    message |> print_error
  }

  use should_use_dir <- promise.try_await(
    {
      "It looks like "
      <> file(dir)
      <> " is your project’s root directory."
      <> is_that_ok_
    }
    |> get_bool(or: True),
  )

  use dir <- promise.try_await(case should_use_dir {
    True -> dir |> Ok |> promise.resolve
    False -> "What is your project’s root directory?" |> get_line(or: "")
  })

  use <- bool.lazy_guard(when: dir == "", return: fn() {
    "can’t proceed without a project root directory"
    |> print_error
    |> Error
    |> promise.resolve
  })

  let dir = case dir |> path_is_absolute {
    True -> dir
    False -> [current_directory(), dir] |> path_join
  }

  use <- bool.lazy_guard(when: not_(dir |> file_is_readable), return: fn() {
    "project root directory is unreadable"
    |> print_error
    |> Error
    |> promise.resolve
  })

  dir |> set_gleam_project

  use project <- promise.try_await(case gleam_project() {
    "" -> "What is your project’s name?" |> get_line(or: "new project")
    name -> name |> Ok |> promise.resolve
  })

  use should_use_gleam <- promise.try_await(case gleam_project() {
    "" -> False |> Ok |> promise.resolve
    _else ->
      {
        "It looks like you can write your handbook in "
        <> gleam()
        <> "."
        <> is_that_ok_
      }
      |> get_bool(or: True)
  })

  use should_use_typescript <- promise.try_await(case should_use_gleam {
    True -> False |> Ok |> promise.resolve
    False ->
      {
        "It looks like you can write your handbook in "
        <> typescript()
        <> "."
        <> is_that_ok_
      }
      |> get_bool(or: True)
  })

  let has_handbookjs = [dir, "handbook.js"] |> path_join |> file_is_readable
  let path =
    case should_use_gleam {
      True -> [dir, "dev", "handbook.gleam"]
      False if should_use_typescript -> [dir, "handbook.ts"]
      False if has_handbookjs -> [dir, "handbook.js"]
      False -> [dir, "handbook.mjs"]
    }
    |> path_join

  use should_write <- promise.try_await(case path |> file_is_readable {
    True ->
      { "The file " <> file(path) <> " already exists." <> overwrite_() }
      |> get_bool(or: False)
    False -> True |> Ok |> promise.resolve
  })

  use <- bool.lazy_guard(when: not_(should_write), return: fn() {
    "can’t proceed without overwriting existing file"
    |> print_error
    |> Error
    |> promise.resolve
  })

  let should_use_deno = runtime_is_deno()

  let success =
    case should_use_gleam {
      True -> gleam_handbook

      False if should_use_deno ->
        javascript_handbook
        |> string.replace(each: "{{module}}", with: "jsr:@tynanbe/kindly@1")

      False ->
        javascript_handbook
        |> string.replace(each: "{{module}}", with: "@tynanbe/kindly")
    }
    |> string.replace(each: "{{project}}", with: project)
    |> file_write(to: path, mode: 0o644, force: True)

  use <- bool.lazy_guard(when: success != Ok(True), return: fn() {
    "failed writing handbook"
    |> print_error
    |> Error
    |> promise.resolve
  })

  let green = 32

  [
    "",
    "Success!" |> ansi(apply: [bold, green]),
    "",
    "Your new handbook module is " <> file(path),
    // TODO: install kindly? already done if running? node_options, runtime
  ]
  |> string.join(with: "\n")
  |> io.println
  |> Ok
  |> promise.resolve
}

/// Promises to result in a `Bool` that depends on the given default and the
/// user's response to the given prompt.
///
/// If the default is `True`, the string `" (Y/n)"` is appended to the given
/// prompt and the `Result` is `True` for any answer that doesn't start with
/// `"n"` (case-insensitive).
///
/// If the default is `False`, the string `" (y/N)"` is appended to the given
/// prompt and the `Result` is only `True` for any answer that start with `"y"`
/// (case-insensitive). Note that this is intentionally more restrictive than
/// the previous case.
///
fn get_bool(
  prompt prompt: String,
  or default: Bool,
) -> Promise(Result(Bool, Nil)) {
  use answer <- promise.map_try(case default {
    True -> { prompt <> nbsp <> "(Y/n)" } |> get_line(or: "y")
    False -> { prompt <> nbsp <> "(y/N)" } |> get_line(or: "n")
  })

  answer
  |> string.trim
  |> string.lowercase
  |> case default {
    True -> fn(x) { not_(x |> string.starts_with("n")) }
    False -> string.starts_with(_, "y")
  }
  |> Ok
}

/// Prints the given `prompt` and tries to read the user's response after a
/// newline is sent.
///
/// If the response is empty, it promises to result in the given default
/// `String` instead.
///
/// Promises to result in an `Error` when EOT is read.
///
fn get_line(
  prompt prompt: String,
  or default: String,
) -> Promise(Result(String, Nil)) {
  { "\n" <> prompt |> wrap_line(with: "") }
  |> do_get_line(or: default)
}

@external(javascript, "./kindly_ffi.ts", "get_line")
fn do_get_line(
  prompt prompt: String,
  or default: String,
) -> Promise(Result(String, Nil))

/// Styles the given file for printing.
///
fn file(file: String) {
  let blue = 34
  "`" <> { file |> ansi(apply: [bold, blue]) } <> "`"
}

/// Returns the word `"Gleam"`, styled for printing.
///
fn gleam() {
  let pink = [38, 5, 219]
  "Gleam" |> ansi(apply: [bold, ..pink])
}

/// Returns the word `"TypeScript"`, styled for printing.
///
fn typescript() {
  let blue = 34
  "TypeScript" |> ansi(apply: [bold, blue])
}

/// Returns the question `"Overwrite?"` on a new line, styled for printing.
///
fn overwrite_() -> String {
  let red = 31
  "\n" <> { "Overwrite?" |> ansi(apply: [bold, red]) }
}

/// Runs a `Handbook` with arguments from the shell.
///
/// Exits the current process with status code `0` for valid help displays or
/// when all selected tasks succeed; otherwise, exits with status code `1`.
///
fn run_handbook(handbook: Handbook) -> Promise(Never) {
  use Args(time:, has_tags:, ..) as args <- exit_unless(
    is_ok: args() |> parse_args(from: Some(handbook)) |> promise.resolve,
  )
  let should_help = args.help || not_(has_tags)

  let handbook =
    Handbook(..handbook, tasks: {
      use task <- list.map(handbook.tasks)
      Task(
        ..task,
        group_doc: task.group_doc |> option.map(with: string.trim),
        doc: task.doc |> string.trim,
      )
    })

  use <- bool.lazy_guard(when: args.cue != None, return: fn() {
    exit(code: case run_cue(with: args, from: handbook) {
      Ok(_) -> 0
      _else -> 1
    })
  })

  let tasks = {
    use Task(tags:, ..) <- list.filter(handbook.tasks)
    args.all_tags |> set.is_subset(of: tags)
    && {
      { has_tags && args.any_tags |> set.is_empty }
      || not_(args.any_tags |> set.is_disjoint(from: tags))
    }
  }

  use <- bool.lazy_guard(when: tasks == [] && not_(should_help), return: fn() {
    "no tasks to run" |> print_error
    exit(code: 1)
  })

  let timestamp = now()

  use success <- promise.await(case should_help {
    True -> tasks |> help_handbook(with: args, from: handbook)
    False -> tasks |> run_tasks(with: args, from: handbook)
  })

  case time {
    True -> print_duration(since: timestamp, apply: handbook.theme)
    False -> Nil
  }

  exit(code: case success {
    Ok(_) -> 0
    Error(_) -> 1
  })
}

/// Runs when `--cue` is given as a valid argument. Generates dynamic
/// completions for arguments given after the end flag (`--`), or a static
/// completion helper script for the given shell otherwise. Also handles
/// `--help --cue` output.
///
fn run_cue(with args: Args, from handbook: Handbook) -> Result(Nil, Nil) {
  let Args(cue:, help:, has_end:, ..) = args

  case cue {
    _ if help ->
      help_cue(cue |> option.unwrap(or: None), apply: handbook.theme) |> Ok

    Some(maybe_shell) if has_end ->
      do_cue(maybe_shell, with: args, from: handbook)
    Some(Some(shell)) ->
      completion_script(for: shell) |> result.map(with: io.println)

    _else -> Nil |> Ok
  }
}

/// Prints help text for the `--cue` flag.
///
fn help_cue(maybe_shell: Option(String), apply theme: Theme) -> Nil {
  let shell = case maybe_shell {
    Some(shell) -> shell
    None -> "shell?"
  }

  [
    info(apply: theme),
    [""],
    usage(
      with: theme.flag("--cue") <> " " <> theme.parameter(shell),
      apply: theme,
    ),
    [""],
    description(
      [
        "Print tab completions for the given shell.",

        "When no end flag (`--`) is given, a script is printed for the given shell to obtain completions from `kindly`.",

        "With an end flag, any further arguments are seen as what would be given to `kindly`, and used to generate completions for the given shell.",

        "If the end flag is given without a shell, default output is printed with an argument and description per line, separated by a tab.",
      ],
      apply: theme,
    ),
    [""],
    flags(with: cue_flags, apply: theme),
    [""],
    ["Shells" |> theme.heading],
    {
      use #(name, doc) <- list.map(cue_shells)
      let blank_name = string.repeat(" ", times: safe_width(of: name))
      let margin = theme.tab <> blank_name <> theme.tab
      case not_(viewport_width_is_narrow(for: margin)) {
        True ->
          { theme.tab <> theme.parameter(name) <> theme.tab <> doc }
          |> wrap_line(with: margin)
        False ->
          { "\n" <> theme.parameter(name) <> "\n" }
          <> { min_tab <> doc } |> wrap_line(with: min_tab)
      }
    },
  ]
  |> list.flatten
  |> string.join(with: "\n")
  |> io.println
}

/// Generates and prints dynamic completions for arguments given after the end
/// flag (`--`), to be consumed by the given shell, defaulting to the
/// tab-delimited format consumed by e.g. `fish`.
///
fn do_cue(
  maybe_shell: Option(String),
  with args: Args,
  from handbook: Handbook,
) -> Result(Nil, Nil) {
  use #(args, current, prev) <- result.try(
    case args.action_args |> list.reverse {
      [current, prev, ..args] ->
        #([prev, ..args] |> list.reverse, current, Some(prev)) |> Ok
      [current] -> #([], current, None) |> Ok
      [] ->
        [
          "can’t run `--cue --` without any further arguments",
          "hint: an empty string '' should represent a blank, incomplete word",
        ]
        |> string.join(with: "\n")
        |> print_error
        |> Error
    },
  )

  let #(args, current, prev, has_eq) = {
    case current |> string.split_once(on: "=") {
      Ok(#("--" <> _ as prev, current)) -> #(
        args |> list.append([prev]),
        current,
        Some(prev),
        True,
      )
      _else -> #(args, current, prev, False)
    }
  }
  let #(args, should_complete_cue) = case prev {
    // Make `--cue` temporarily pass `validate_args`
    Some("--cue") -> #(args |> list.append(["bash"]), True)
    _else -> #(args, False)
  }

  use Args(cue:, help:, new:, time:, ..) as args <- result.try(
    args |> parse_args(from: Some(handbook)),
  )
  let Args(has_any:, has_end:, has_tags:, ..) = args

  use <- bool.lazy_guard(when: help && { cue != None || new }, return: fn() {
    "can’t accept any further arguments" |> print_error |> Error
  })

  use <- bool.lazy_guard(when: has_end, return: fn() { Ok(Nil) })

  let terminal_width = terminal_width()

  let handbook_flags = case handbook.tasks {
    [] -> blank_handbook_flags
    _else -> handbook_flags
  }

  let #(lines, arg_width, line_width) = {
    use #(lines, arg_width, line_width) as acc, #(arg, doc) <- list.fold(
      from: #([], 0, 0),
      over: case current {
        _ if cue != None -> [cue_shells, cue_flags] |> list.flatten
        "-" <> _ -> handbook_flags
        _else ->
          case handbook.tasks |> cue_tags(with: args) {
            [] -> handbook_flags
            tags -> tags |> list.append([#("--", end_flag_doc)])
          }
      },
    )
    let arg = arg |> string.trim

    let should_discard =
      case arg {
        // Help
        "--help" if has_eq -> True
        "--help" -> help

        // New
        _ if new -> True

        // Flags
        "--" -> has_eq
        // TODO: discard if no more tags?
        "--any" -> has_any
        "--cue" -> has_tags || has_any || time
        "--new" -> has_tags || has_any || cue != None || time
        "--time" -> time

        // Cue
        _ if cue != None && !should_complete_cue -> True

        _else -> False
      }
      // TODO: keep fuzzy matches?
      || not_(arg |> string.starts_with(current))

    use <- bool.guard(when: should_discard, return: acc)

    let arg = case prev {
      Some(prev) if has_eq && maybe_shell != Some("bash") -> prev <> "=" <> arg
      _else -> arg
    }
    let arg_width = arg |> safe_width |> int.max(arg_width)
    let line_width =
      { arg <> "  (" <> doc <> ")" }
      |> common_width
      |> int.max(line_width)
      |> int.min(terminal_width)

    #([#(arg, doc), ..lines], arg_width, line_width)
  }

  let should_doc = case lines {
    [_, _, ..] if line_width - arg_width > 19 -> True
    _else -> False
  }

  let lines = {
    use #(arg, doc) <- list.map(lines |> list.reverse)
    let line = case maybe_shell {
      Some("bash") | Some("pwsh") if should_doc -> {
        let arg_width = arg |> common_width
        let doc_width = line_width - arg_width
        let doc = "  (" <> doc <> ")"
        case safe_width(of: doc) > doc_width {
          True -> arg <> truncate_width(doc, to: doc_width - 2) <> "…)"
          False -> arg <> pad_width_left(doc, to: doc_width)
        }
      }
      Some("zsh") if should_doc -> {
        let escape = string.replace(each: ":", with: "\\:", in: _)
        escape(arg) <> ":" <> escape(doc)
      }
      _else if should_doc -> arg <> "\t" <> doc
      _else -> arg
    }
    case maybe_shell {
      Some("pwsh") -> arg <> "\t" <> line <> "\t" <> doc
      _else -> line
    }
  }

  case lines {
    [_, ..] ->
      lines
      |> string.join(with: "\n")
      |> io.println
      |> Ok
    _else -> "no more completions" |> print_error |> Error
  }
}

/// Returns tags that can be added via command completion based on the given
/// args.
///
fn cue_tags(tasks: List(Task), with args: Args) -> List(#(String, String)) {
  let given_tags = args.all_tags |> set.union(args.any_tags)
  let has_tags = not_(args.all_tags |> set.is_empty)

  let available_tasks = {
    use Task(tags:, ..) <- list.filter(tasks)
    args.all_tags |> set.is_subset(of: tags)
    && args.any_tags |> set.is_disjoint(from: tags)
  }

  let tasks = case available_tasks {
    [] if has_tags -> []
    [] -> tasks
    tasks -> tasks
  }

  let #(firsts, rests) = {
    use #(firsts, rests), Task(tags:, group_doc:, doc:, ..) <- list.fold(
      over: tasks,
      from: #(dict.new(), dict.new()),
    )
    case tags |> set.to_list {
      [first, ..rest] -> {
        let firsts = case given_tags |> set.contains(first) {
          True -> firsts
          False -> {
            use tag <- dict.upsert(in: firsts, update: first)
            case tag {
              Some(#(doc, x)) -> #(doc, x + 1)
              None -> #(group_doc |> option.unwrap(or: doc), 1)
            }
          }
        }
        let rests = {
          use rests, tag <- list.fold(over: rest, from: rests)
          case given_tags |> set.contains(tag) {
            True -> rests
            False -> {
              use tag <- dict.upsert(in: rests, update: tag)
              case tag {
                Some(#(_, x)) -> #("", x + 1)
                None -> #(doc, 1)
              }
            }
          }
        }
        #(firsts, rests)
      }
      [] -> #(firsts, rests)
    }
  }

  let rests =
    rests |> dict.filter(keeping: fn(x, _) { not_(firsts |> dict.has_key(x)) })

  let firsts = {
    use #(tag, #(doc, count)) <- list.map(firsts |> dict.to_list)
    let count = case count {
      1 -> ""
      _else -> ": " <> int.to_string(count) <> " tasks"
    }
    #(tag, doc <> count)
  }
  let rests = {
    use #(tag, #(doc, count)) <- list.map(rests |> dict.to_list)
    let info = case count {
      1 -> doc
      _else -> int.to_string(count) <> " tasks"
    }
    #(tag, info)
  }

  [firsts, rests]
  |> list.map(
    with: list.sort(_, by: fn(a, b: #(String, _)) { string.compare(a.0, b.0) }),
  )
  |> list.flatten
}

/// Sequentially runs the action function for each selected `Task`.
///
/// Prints a heading, and summary of failed tasks when multiple tasks are run.
///
/// Each task's action function is called with the parsed action arguments and
/// the `Handbook`.
///
fn run_tasks(
  run tasks: List(Task),
  with args: Args,
  from handbook: Handbook,
) -> TaskResult {
  let theme = handbook.theme
  let kindly = "Kindly" |> theme.highlight |> ansi(apply: [italic])
  let running_tasks_for =
    case tasks |> list.length |> int.to_string {
      "1" -> "a task"
      x -> x <> " tasks"
    }
    |> fn(x) { " running " <> x <> " for " }
    |> theme.heading
    |> ansi(apply: [italic])
  let name = handbook.name |> theme.highlight |> ansi(apply: [italic])

  // Print main heading
  { kindly <> running_tasks_for <> name }
  |> wrap_line(with: "")
  |> io.println

  // Run tasks
  use #(tried, failed) <- promise.map(
    #(0, 0)
    |> run_tasks_loop(for: tasks, with: args.action_args, from: handbook),
  )

  let summarise_failures = fn() {
    "" |> io.println_error

    case tried |> int.to_string, failed |> int.to_string {
      "2", "2" -> "both tasks failed"
      tried, failed if tried == failed -> "all " <> tried <> " tasks failed"
      tried, failed -> failed <> " of " <> tried <> " tasks failed"
    }
    |> print_error
  }

  case failed {
    0 -> Ok(Nil)
    _else if tried > 1 -> summarise_failures() |> Error
    _else -> Error(Nil)
  }
}

fn run_tasks_loop(
  acc: #(Int, Int),
  for tasks: List(Task),
  with args: List(String),
  from handbook: Handbook,
) -> Promise(#(Int, Int)) {
  case tasks {
    [Task(doc:, tags:, action:, ..), ..tasks] -> {
      let theme = handbook.theme
      let #(tried, failed) = acc
      let tried = tried + 1

      let heading =
        case tasks {
          [] if tried == 1 -> ""
          _else -> " " <> int.to_string(tried)
        }
        |> fn(x) { "Task" <> x <> ":" }
        |> theme.heading
        |> ansi(apply: [italic])

      let doc =
        case doc {
          "" ->
            case tags |> set.to_list {
              [tag, ..] -> " " <> string.capitalise(tag)
              _else -> " Unknown"
            }
          _else -> " " <> doc
        }
        |> ansi(apply: [italic])

      let heading = { heading <> doc } |> wrap_line(with: "")

      // Print `Task` heading
      { "\n" <> heading } |> io.println

      // Run `Task`
      use result <- promise.await(case change_directory(to: project_root()) {
        Ok(_) -> fn() { action(args, handbook.tasks) } |> rescue
        Error(_) -> reject()
      })

      case result {
        Ok(_) -> #(tried, failed)
        Error(_) -> {
          "task failed" |> print_error
          #(tried, failed + 1)
        }
      }
      |> run_tasks_loop(for: tasks, with: args, from: handbook)
    }

    // Done
    [] -> acc |> promise.resolve
  }
}

/// Prints help information for the given tasks.
///
fn help_handbook(
  for tasks: List(Task),
  with args: Args,
  from handbook: Handbook,
) -> TaskResult {
  let #(sections, success) = case tasks {
    [] -> #(handbook |> handbook_menu, not_(args.has_tags))
    _else -> #(tasks |> handbook_plan(with: args, from: handbook), True)
  }

  let sections =
    sections
    |> list.flatten
    |> string.join(with: "\n")

  case success {
    True -> io.println(sections) |> Ok
    False -> {
      "no tasks to run\n" |> print_error
      io.println_error(sections) |> Error
    }
  }
  |> promise.resolve
}

/// Returns printable sections for the full `Handbook` help menu.
///
fn handbook_menu(from handbook: Handbook) -> List(List(String)) {
  let theme = handbook.theme
  let name = handbook.name |> theme.highlight

  [
    info(apply: theme),
    [""],
    usage(with: "...tags?" |> theme.tag, apply: theme),
    [""],
    flags(with: handbook_flags, apply: theme),
    [""],
    [
      { "Task menu for " <> name }
      |> theme.heading
      |> wrap_line(with: ""),
    ],
    handbook
      |> menu_tasks,
  ]
}

/// Returns help menu lines.
///
/// Each menu item has a heading, possibly a line of tags shared by all item
/// tasks, and lines for tags specific to each task.
///
fn menu_tasks(from handbook: Handbook) -> List(String) {
  let theme = handbook.theme
  let menu_items = [] |> menu_tasks_loop(from: handbook.tasks)

  use <- bool.guard(when: menu_items == [], return: [
    theme.tab <> "None. The handbook is empty!",
  ])

  let tag_width = {
    use acc, item <- list.fold(over: menu_items, from: 0)
    item.tag
    |> safe_width
    |> int.max(acc)
  }
  let margin = theme.tab <> string.repeat(" ", times: tag_width) <> theme.tab

  use MenuItem(tasks:, tag:, doc:) <- list.flat_map(over: menu_items)

  let count = case tasks |> list.length |> int.to_string {
    "1" -> ""
    x -> { " (" <> x <> ")" } |> theme.heading
  }

  let heading =
    tag
    |> pad_width_right(to: tag_width)
    |> theme.first_tag
    |> theme.tag
    |> fn(x) {
      case not_(viewport_width_is_narrow(for: margin)) {
        True ->
          { theme.tab <> x <> theme.tab <> doc <> count }
          |> wrap_line(with: margin)
        False ->
          { "\n" <> x <> "\n" }
          <> { min_tab <> doc <> count } |> wrap_line(with: min_tab)
      }
    }

  let margin = margin <> theme.tab
  let margin = case not_(viewport_width_is_narrow(for: margin)) {
    True -> margin
    False -> ""
  }
  let tag_items = {
    use tags <- list.map(tasks |> menu_tags)
    let #(indicator, tags) = case tags {
      GroupItem(tags) -> #("∩ ", tags)
      TaskItem(tags) -> #("· ", tags)
    }
    tags
    |> list.map(with: theme.tag)
    |> string.join(with: ", ")
    |> fn(x) {
      { margin <> theme.heading(indicator) <> x }
      |> wrap_line(with: margin <> "  ")
    }
  }

  [heading, ..tag_items]
}

/// A type for preparing to print a formatted group of tasks, each with the same
/// first tag.
///
type MenuItem {
  MenuItem(doc: String, tag: String, tasks: List(Set(String)))
}

fn menu_tasks_loop(
  acc: List(MenuItem),
  from tasks: List(Task),
) -> List(MenuItem) {
  case tasks {
    [Task(tags:, group_doc:, doc:, ..), ..tasks] ->
      case tags |> set.to_list {
        [tag, ..tags] -> {
          let tags = tags |> set.from_list
          let doc = case group_doc {
            Some(doc) -> doc
            None -> doc
          }
          case acc {
            [item, ..acc] if doc == item.doc && tag == item.tag -> [
              // Group tag `Set` with previous `MenuItem`
              MenuItem(..item, tasks: [tags, ..item.tasks]),
              ..acc
            ]
            _else -> [
              // Add new `MenuItem`
              MenuItem(doc:, tag:, tasks: [tags]),
              ..acc
            ]
          }
        }

        // Omit tagless `Task`
        [] -> acc
      }
      |> menu_tasks_loop(from: tasks)

    // Done
    [] ->
      acc
      |> list.reverse
      |> list.map(with: fn(x) { MenuItem(..x, tasks: x.tasks |> list.reverse) })
  }
}

/// A type for indicating whether tags belong to a group of tasks or an
/// individual task.
///
type TagItem {
  GroupItem(List(String))
  TaskItem(List(String))
}

/// Converts tag sets into lists corresponding to a menu item's tasks, possibly
/// prepending a list of tags shared by all item tasks in the process.
///
fn menu_tags(from tag_sets: List(Set(String))) -> List(TagItem) {
  let group = case tag_sets |> list.reduce(with: set.intersection) {
    Ok(group) -> group
    _else -> set.new()
  }
  let tasks = {
    use acc, task <- list.fold(over: tag_sets |> list.reverse, from: [])
    case task |> set.difference(group) |> set.to_list {
      [] -> acc
      task -> [task |> TaskItem, ..acc]
    }
  }

  case group |> set.to_list {
    [] -> tasks
    tags if tasks == [] -> [tags |> TaskItem]
    tags -> [tags |> GroupItem, ..tasks]
  }
}

/// Returns printable sections for tasks selected from the `Handbook` based on
/// the arguments given to the program.
///
fn handbook_plan(
  for tasks: List(Task),
  with args: Args,
  from handbook: Handbook,
) -> List(List(String)) {
  let theme = handbook.theme
  let steps = tasks |> list.length
  let count = case steps |> int.to_string {
    "1" -> "a task"
    x -> x <> " tasks"
  }
  let name = handbook.name |> theme.highlight

  [
    info(apply: theme),
    [""],
    usage(with: args |> plan_tags(from: handbook), apply: theme),
    [""],
    flags(with: handbook_flags, apply: theme),
    [""],
    [
      { "Planning " <> count <> " for " <> name }
      |> theme.heading
      |> wrap_line(with: ""),
    ],
    tasks
      |> plan_tasks(with: args, and: steps, apply: theme)
      |> list.flatten,
  ]
}

/// Returns a themed string of tags parsed from the arguments given to the
/// program.
///
fn plan_tags(with args: Args, from handbook: Handbook) -> String {
  let theme = handbook.theme
  let first_tags = {
    use acc, Task(tags:, ..) <- list.fold(over: handbook.tasks, from: set.new())
    case tags |> set.to_list {
      [tag, ..] -> acc |> set.insert(tag)
      [] -> acc
    }
  }
  let theme_tags = fn(tags) {
    use tag <- list.map(tags |> set.to_list)
    case first_tags |> set.contains(tag) {
      True -> tag |> theme.first_tag
      False -> tag
    }
    |> theme.tag
  }

  args.all_tags
  |> theme_tags
  |> list.append(case args.any_tags |> theme_tags {
    [] -> []
    any_tags -> ["--any" |> theme.flag, ..any_tags]
  })
  |> string.join(with: " ")
}

/// Returns grouped lines of selected tasks, each with description and tags.
///
fn plan_tasks(
  from tasks: List(Task),
  with args: Args,
  and steps: Int,
  apply theme: Theme,
) -> List(List(String)) {
  use <- bool.guard(when: tasks == [], return: [
    [theme.tab <> "None. The plan is empty!"],
  ])

  let indicator = fn(step) {
    case steps {
      1 -> "· "
      _else -> int.to_string(step) <> ": "
    }
  }
  let step_width = steps |> indicator |> safe_width
  let margin = theme.tab <> string.repeat(" ", times: step_width)

  let given_tags = args.all_tags |> set.union(args.any_tags)
  let maybe_given_tag = fn(tag) {
    case given_tags |> set.contains(tag) {
      True -> tag |> theme.given_tag
      // TODO: revise
      False -> tag |> ansi(apply: [dim])
    }
  }

  use Task(tags:, doc:, ..), i <- list.index_map(tasks)

  let heading =
    { i + 1 }
    |> indicator
    |> fn(x) {
      case not_(viewport_width_is_narrow(for: margin)) {
        True -> x |> pad_width_left(to: step_width)
        False -> x
      }
    }
    |> theme.heading
    |> ansi(apply: [italic])

  let tags = case tags |> set.to_list {
    [tag, ..tags] ->
      tag
      |> maybe_given_tag
      |> theme.first_tag
      |> theme.tag
      |> list.fold(over: tags, with: fn(acc, tag) {
        tag
        |> maybe_given_tag
        |> theme.tag
        |> fn(x) { acc <> ", " <> x }
      })
    [] -> ""
  }

  case not_(viewport_width_is_narrow(for: margin)) {
    True -> [
      { theme.tab <> heading <> doc } |> wrap_line(with: margin),
      { margin <> theme.tab <> tags } |> wrap_line(with: margin <> theme.tab),
    ]
    False -> [
      "\n" <> { heading <> doc } |> wrap_line(with: ""),
      { min_tab <> tags } |> wrap_line(with: min_tab),
    ]
  }
}

/// Returns lines with basic information about Kindly itself.
///
fn info(apply theme: Theme) -> List(String) {
  let kindly = "kindly" |> theme.highlight |> ansi(apply: [italic])
  let version = { "v" <> kindly_version() } |> ansi(apply: [italic])
  let tagline = kindly_description() |> theme.flag |> ansi(apply: [italic])

  [
    { kindly <> " " <> version } |> wrap_line(with: ""),
    case not_(viewport_width_is_narrow(for: theme.tab)) {
      True -> { theme.tab <> tagline } |> wrap_line(with: theme.tab)
      False -> "\n" <> { min_tab <> tagline } |> wrap_line(with: min_tab)
    },
  ]
}

/// Returns Kindly's current version, statically generated from `gleam.toml`.
///
@external(javascript, "./kindly_ffi.ts", "kindly_version")
fn kindly_version() -> String

/// Returns Kindly's description, statically generated from `gleam.toml`.
///
@external(javascript, "./kindly_ffi.ts", "kindly_description")
fn kindly_description() -> String

/// Returns lines summarising the format for invoking Kindly from the shell.
///
fn usage(with args: String, apply theme: Theme) -> List(String) {
  let kindly = "kindly" |> theme.highlight
  let flags = "...flags?" |> theme.flag
  let params = "...arguments?" |> theme.parameter

  let args = case args {
    "" -> args
    _else -> " " <> args
  }

  [
    "Usage" |> theme.heading,
    case not_(viewport_width_is_narrow(for: theme.tab)) {
      True ->
        { theme.tab <> kindly <> args <> " " <> flags <> " " <> params }
        |> wrap_line(with: theme.tab <> theme.tab)
      False ->
        "\n"
        <> { kindly <> args <> " " <> flags <> " " <> params }
        |> wrap_line(with: min_tab)
    },
  ]
}

/// Returns a formatted description section with the given `lines`.
///
fn description(lines: List(String), apply theme: Theme) -> List(String) {
  [
    "Description" |> theme.heading,
    ..case not_(viewport_width_is_narrow(for: theme.tab)) {
      True -> {
        use line <- list.map(lines |> list.intersperse(with: ""))
        { theme.tab <> line } |> wrap_line(with: theme.tab)
      }
      False -> {
        use line <- list.map(lines)
        "\n" <> line |> wrap_line(with: "")
      }
    }
  ]
}

/// Returns lines summarising optional flag arguments that alter Kindly's
/// default behaviour.
///
fn flags(
  with flags: List(#(String, String)),
  apply theme: Theme,
) -> List(String) {
  [
    "Flags" |> theme.heading,
    ..{
      use #(name, description) <- list.map(flags)
      let blank_name = string.repeat(" ", times: safe_width(of: name))
      let margin = theme.tab <> blank_name <> theme.tab
      case not_(viewport_width_is_narrow(for: margin)) {
        True ->
          { theme.tab <> theme.flag(name) <> theme.tab <> description }
          |> wrap_line(with: margin)
        False ->
          { "\n" <> theme.flag(name) <> "\n" }
          <> { min_tab <> description } |> wrap_line(with: min_tab)
      }
    }
  ]
}

/// Prints a summary of how long the help display or selected tasks took to run.
///
fn print_duration(since timestamp: Int, apply theme: Theme) {
  // integer, fraction | noitcarf, regetni
  // For both parts, pad_left only applies when time doesn't have enough digits
  let #(noitcarf, regetni) =
    { now() - timestamp }
    |> int.to_string
    |> string.to_graphemes
    |> list.reverse
    |> list.split(at: 3)
  let integer =
    regetni
    |> list.sized_chunk(into: 3)
    |> list.intersperse(with: [","])
    |> list.flatten
    |> list.reverse
    |> string.concat
    |> string.pad_start(to: 1, with: "0")
  let fraction =
    noitcarf
    |> list.reverse
    |> string.concat
    |> string.pad_start(to: 3, with: "0")
  let time =
    { "All done in " <> integer <> "." <> fraction <> " seconds" }
    |> theme.time
    |> wrap_line(with: "")

  { "\n" <> time }
  |> io.println
}

/// Promises to pass an `Ok` result's value to the given function, or exits the
/// program on `Error`.
///
fn exit_unless(
  is_ok cond: Promise(Result(a, Nil)),
  then f: fn(a) -> Promise(Never),
) -> Promise(Never) {
  use result <- promise.await(cond)

  case result {
    Ok(x) -> f(x)
    _else -> exit(code: 1)
  }
}

/// Prints an error message to `stderr`.
///
fn print_error(message: String) -> Nil {
  let red = 31
  let heading = "error" |> ansi(apply: [bold, red])
  let message = { ": " <> message } |> ansi(apply: [bold])

  { heading <> message }
  |> wrap_line(with: "")
  |> io.println_error
}

/// Returns a `Bool` indicating whether the current viewport has a narrow width.
///
/// Useful for setting a responsive layout breakpoint.
///
fn viewport_width_is_narrow(for margin: String) -> Bool {
  let width = get_max_width() |> int.min(terminal_width())

  width - safe_width(of: margin) < min_width
}

/// Parses `KINDLY_MAX_WIDTH` from the environment, bounded by `min_width` and
/// `max_width`.
///
/// `KINDLY_MAX_WIDTH` can be used to customize Kindly's output for more
/// comfortable viewing.
///
fn get_max_width() -> Int {
  "KINDLY_MAX_WIDTH"
  |> get_env
  |> result.try(apply: int.parse)
  |> result.unwrap(or: max_width)
  |> int.max(min_width)
}

/// Returns a wrapped version of the given `line`, maintaining a given `margin`
/// for any wrapped lines, attempting to keep words intact and fit content
/// within the detected max viewport width.
///
fn wrap_line(line: String, with margin: String) -> String {
  let width = get_max_width() |> int.min(terminal_width())
  let replace_nbsps = string.replace(each: nbsp, with: " ", in: _)

  use <- bool.guard(
    when: safe_width(of: line) <= width,
    return: line |> replace_nbsps,
  )

  case line |> string.split(on: " ") {
    [word, ..words] -> {
      #([word], safe_width(of: word))
      |> wrap_line_loop(for: words, with: margin, at: width)
      |> replace_nbsps
    }
    [] -> ""
  }
}

fn wrap_line_loop(
  acc: #(List(String), Int),
  for words: List(String),
  with margin: String,
  at width: Int,
) -> String {
  let #(new_lines, acc_width) = acc

  case words {
    [word, ..words] -> {
      let word_width = word |> safe_width
      let new_width = acc_width + word_width + 1
      case new_lines {
        // Append word to current line
        [line, ..new_lines] if new_width <= width -> #(
          [line <> " " <> word, ..new_lines],
          new_width,
        )
        // Start a new line with margin and word
        _else -> #(
          [margin <> word, ..new_lines],
          common_width(margin) + word_width,
        )
      }
      |> wrap_line_loop(for: words, with: margin, at: width)
    }

    // Done
    [] -> new_lines |> list.reverse |> string.join(with: "\n")
  }
}

/// Returns a `String` after clipping it to the given `width`, blanket resetting
/// ANSI styles at the end, rather than detecting when a style reset was
/// clipped.
///
fn truncate_width(x: String, to width: Int) -> String {
  {
    x
    |> string.to_graphemes
    |> truncate_width_loop("", for: _, to: width, assuming: False)
  }
  <> "\u{1b}[m\u{1b}[K"
}

fn truncate_width_loop(
  acc: String,
  for xs: List(String),
  to width: Int,
  assuming escaped: Bool,
) -> String {
  case xs {
    [x, ..xs] if x == "\u{1b}" ->
      truncate_width_loop(acc <> x, for: xs, to: width, assuming: True)

    [x, ..xs] if escaped -> {
      let escaped = case x |> string.compare("@"), x |> string.compare("~") {
        Lt, _ | _, Gt -> True
        _or, _else -> False
      }
      truncate_width_loop(acc <> x, for: xs, to: width, assuming: escaped)
    }

    [x, ..xs] -> {
      let x = acc <> x
      case safe_width(of: x) <= width {
        True -> truncate_width_loop(x, for: xs, to: width, assuming: False)

        // Done
        False -> acc
      }
    }

    // Done
    _else -> acc
  }
}

/// Pads the given `String` to a specific `width` by adding space on the left.
///
fn pad_width_left(x: String, to width: Int) -> String {
  case width - common_width(x) {
    pad if pad > 0 -> string.repeat(" ", times: pad) <> x
    _else -> x
  }
}

/// Pads the given `String` to a specific `width` by adding space on the right.
///
fn pad_width_right(x: String, to width: Int) -> String {
  case width - common_width(x) {
    pad if pad > 0 -> x <> string.repeat(" ", times: pad)
    _else -> x
  }
}

/// Gets the common display width of the given `String`.
///
fn common_width(of x: String) -> Int {
  x |> string_width.line
}

/// Gets the safe (max) display width of the given `String`.
///
fn safe_width(of x: String) -> Int {
  let options = string_width.new() |> string_width.ambiguous_as_wide
  x |> string_width.line_with(options)
}

/// Negates the given `Bool` more visibly.
///
fn not_(x: Bool) -> Bool {
  !x
}

/// Returns a `List` of arguments given when invoking the program.
///
/// Arguments given directly to the program have precedence.
///
/// If no arguments are given directly, they may be supplied via stdin.
///
@external(javascript, "./kindly_ffi.ts", "args")
fn args() -> List(String)

/// Changes the current working directory.
///
@external(javascript, "./kindly_ffi.ts", "change_directory")
fn change_directory(to path: String) -> Result(Nil, String)

/// Returns a script for adding Kindly command completion to the given shell.
///
@external(javascript, "./kindly_ffi.ts", "completion_script")
fn completion_script(for shell: String) -> Result(String, Nil)

/// Returns the path of the current working directory.
///
@external(javascript, "./kindly_ffi.ts", "current_directory")
fn current_directory() -> String

/// Exits the program.
///
@external(javascript, "./kindly_ffi.ts", "exit")
fn exit(code code: Int) -> Promise(Never)

/// Determines whether the given path exists and is readable.
///
@external(javascript, "./kindly_ffi.ts", "file_is_readable")
fn file_is_readable(path path: String) -> Bool

/// Tries to write the given content to a file with the given path and octal
/// mode, optionally overwriting a pre-existing file.
///
@external(javascript, "./kindly_ffi.ts", "file_write")
fn file_write(
  to path: String,
  with content: String,
  mode mode: Int,
  force overwrite: Bool,
) -> Result(Bool, Nil)

/// Returns the `run` function from the project's `Handbook`, if found, or an
/// `Error(Nil)` otherwise.
///
@external(javascript, "./kindly_ffi.ts", "get_handbook")
fn get_handbook() -> Result(fn() -> Promise(Never), Nil)

/// Returns the name of the current project read from `gleam.toml`, otherwise an
/// empty `String`.
///
@external(javascript, "./kindly_ffi.ts", "gleam_project")
fn gleam_project() -> String

/// Determines whether the given path is absolute.
///
@external(javascript, "./kindly_ffi.ts", "path_is_absolute")
fn path_is_absolute(path: String) -> Bool

/// Joins a `List` of paths into a new path and normalizes the result.
///
@external(javascript, "./kindly_ffi.ts", "path_join")
fn path_join(parts: List(String)) -> String

/// Returns the current project's root directory.
///
@external(javascript, "./kindly_ffi.ts", "project_root")
fn project_root() -> String

///  Wraps a task-like function that may throw, returning
/// `Promise(Result(Nil, Nil))`, discarding any success payload.
///
/// Normalizes foreign JavaScript `Result` values across the module boundary.
///
@external(javascript, "./kindly_ffi.ts", "rescue")
fn rescue(f: fn() -> Promise(Result(a, Nil))) -> Promise(Result(Nil, Nil))

/// Determines whether the program is using the Deno runtime.
///
@external(javascript, "./kindly_ffi.ts", "runtime_is_deno")
fn runtime_is_deno() -> Bool

/// Returns a `Bool` indicating whether the given `tag` is valid, e.g. it
/// doesn't start with a "`-`" or contain any spaces.
///
@external(javascript, "./kindly_ffi.ts", "tag_is_valid")
fn tag_is_valid(tag: String) -> Bool

/// Returns the terminal width, guessing, if necessary.
///
@external(javascript, "./kindly_ffi.ts", "terminal_width")
fn terminal_width() -> Int

// ⬤ •╱ *╱.
//  ˙ ‧╱╱  
// ╱╲*.·   
//   ╲╱╲   
//  ꟸ ╲ ╲ Library
// .˙‧∴.˙∵‧
// Ψ˙ ≁ ˙  
//   ↀ ʽ ⍦ 
// ⍭  ’ ‚  
//   ‟╷│   
// ’  ╰┼╯ „
//  ‟      

/// The main Kindly data type, a named collection of tasks.
///
pub opaque type Handbook {
  Handbook(
    name: String,
    tasks: List(Task),
    theme: Theme,
    run: fn() -> Promise(Never),
  )
}

/// Returns a new Kindly `Handbook` with the given project name.
///
pub fn handbook(for name: String) -> Handbook {
  Handbook(name:, tasks: [], theme: default_theme(), run: main) |> update
}

/// Updates a handbook's `run` function with a new reference to the `Handbook`.
///
/// The `run` function is only stored in the `Handbook` so its invocation will
/// succeed with any combination of Gleam and JavaScript module and runtime;
/// otherwise, JavaScript's `instanceof` keyword may fail due to differences
/// between compiled Gleam and bundled JavaScript code.
///
fn update(handbook: Handbook) -> Handbook {
  Handbook(..handbook, run: fn() { run_handbook(handbook) })
}

/// A type for styles applied to Kindly output.
///
pub type Theme {
  Theme(
    highlight: fn(String) -> String,
    heading: fn(String) -> String,
    tag: fn(String) -> String,
    first_tag: fn(String) -> String,
    given_tag: fn(String) -> String,
    flag: fn(String) -> String,
    parameter: fn(String) -> String,
    time: fn(String) -> String,
    tab: String,
  )
}

/// Applies the given `Theme` to Kindly output.
///
pub fn theme(handbook: Handbook, with theme: Theme) -> Handbook {
  Handbook(..handbook, theme:) |> update
}

/// Returns Kindly's default display `Theme`.
///
/// This theme uses a selection of the terminal's configured colours.
///
pub fn default_theme() -> Theme {
  let blue = 34
  let cyan = 36
  let green = 32
  let yellow = 33
  let bright_black = 90
  let bright_purple = 95

  Theme(
    highlight: [bold, cyan] |> styler,
    heading: [bold, bright_purple] |> styler,
    tag: [yellow] |> styler,
    first_tag: [bold] |> styler,
    given_tag: [italic] |> styler,
    flag: [green] |> styler,
    parameter: [blue] |> styler,
    time: [bold, italic, bright_black] |> styler,
    tab: min_tab,
  )
}

/// Returns a Gleam-inspired `Theme`.
///
pub fn gleam_theme() -> Theme {
  let bit8 = fn(code) { [38, 5, code] }
  let blue = bit8(123)
  let green = bit8(158)
  let pink = bit8(219)
  let purple = bit8(183)
  let yellow = bit8(223)

  Theme(
    ..default_theme(),
    highlight: [bold, ..blue] |> styler,
    heading: [bold, ..pink] |> styler,
    tag: yellow |> styler,
    flag: purple |> styler,
    parameter: green |> styler,
  )
}

/// Returns a `Theme` that uses the terminal's default display style.
///
pub fn plain_theme() -> Theme {
  Theme(
    ..default_theme(),
    highlight: [] |> styler,
    heading: [] |> styler,
    tag: [] |> styler,
    first_tag: [] |> styler,
    given_tag: [underline] |> styler,
    flag: [] |> styler,
    parameter: [] |> styler,
    time: [] |> styler,
  )
}

/// Returns a function that styles a `String` with the given ANSI codes.
///
pub fn styler(will_apply styles: List(Int)) -> fn(String) -> String {
  fn(content) { content |> ansi(apply: styles) }
}

/// The main Kindly unit type.
///
pub type Task {
  Task(
    doc: String,
    tags: Set(String),
    action: fn(List(String), List(Task)) -> TaskResult,
    group_doc: Option(String),
  )
}

/// A return type for `Task` actions.
///
type TaskResult =
  Promise(Result(Nil, Nil))

/// Adds a `Task` to the `Handbook`.
///
/// The given `action` is provided a `List` of argument strings and must return
/// a `Promise(Result(Nil, Nil))` indicating success.
///
pub fn task(
  handbook: Handbook,
  doc doc: String,
  tags tags: List(String),
  action action: fn(List(String)) -> TaskResult,
) -> Handbook {
  let action = fn(args, _) { action(args) }

  handbook |> task_with_tasks(doc:, tags:, action:) |> update
}

/// Adds a `Task` to the `Handbook`, differing from a standard task in that its
/// `action` is given the handbook's complete list of tasks in addition to any
/// runtime arguments.
///
/// As with `task`, the given `action` is also provided a `List` of argument
/// strings and must return a `Promise(Result(Nil, Nil))` indicating success.
///
pub fn task_with_tasks(
  handbook: Handbook,
  doc doc: String,
  tags tags: List(String),
  action action: fn(List(String), List(Task)) -> TaskResult,
) -> Handbook {
  let task =
    Task(
      // gleam-format-wangle
      doc:,
      tags: tags |> set.from_list,
      action:,
      group_doc: None,
    )

  Handbook(..handbook, tasks: handbook.tasks |> list.append([task])) |> update
}

/// Adds a `Task` group to the `Handbook`.
///
/// Kindly's main help menu compresses the display of grouped tasks under the
/// given `doc` and prepends the given `group_tags` for all grouped tasks.
///
/// Conceptually similar to `map`, but with the aforementioned structural
/// conveniences.
///
pub fn group(
  handbook: Handbook,
  doc doc: String,
  tags group_tags: List(String),
  apply f: fn(Handbook) -> Handbook,
) -> Handbook {
  let tasks = handbook.tasks
  let handbook = f(Handbook(..handbook, tasks: []))

  let group_tags = group_tags |> set.from_list
  let group_tasks = {
    use task <- list.map(handbook.tasks)
    Task(
      // gleam-format-wangle
      ..task,
      tags: group_tags |> set.union(task.tags),
      group_doc: Some(doc),
    )
  }

  Handbook(..handbook, tasks: tasks |> list.append(group_tasks)) |> update
}

/// Modifies the `Handbook` with the given function.
///
/// Can be used in the main `Handbook` builder pipeline, for example, to keep
/// tasks together with logic used to generate them.
///
pub fn map(handbook: Handbook, with f: fn(Handbook) -> Handbook) -> Handbook {
  f(handbook) |> update
}

/// Calls and awaits the given function's `Result`. On success, promises to
/// return the callback function's `Result`. If either `Result` is an `Error`,
/// an `Error(Nil)` is promised instead.
///
/// Enables chaining function calls such that each `step` can only run after the
/// previous `step` succeeded.
///
pub fn step(
  f: fn() -> Promise(Result(a, b)),
  then do: fn(a) -> Promise(Result(c, d)),
) -> Promise(Result(c, Nil)) {
  use result <- promise.await(f())

  case result {
    Ok(x) -> do(x) |> promise.map(result.replace_error(_, Nil))
    Error(_) -> Error(Nil) |> promise.resolve
  }
}

/// Combines `step` and `command`, enabling function chains akin to shell `&&`
/// sequences.
///
pub fn command_step(
  run bin: String,
  with args: List(String),
  then do: fn() -> TaskResult,
) -> TaskResult {
  use _ <- step(fn() { command(run: bin, with: args) })

  do()
}

/// Promises to return an `Ok(Nil)` result. Useful for ending a multistep `Task`
/// successfully.
///
pub fn resolve() -> TaskResult {
  Ok(Nil) |> promise.resolve
}

/// Promises to return an `Error(Nil)` result. Useful for ending a multistep
/// `Task` in failure.
///
pub fn reject() -> TaskResult {
  Error(Nil) |> promise.resolve
}

/// Returns the given `content` with ANSI `styles` applied, ending with a style
/// reset.
///
/// Returns the given `content` unstyled when the `NO_COLOR` or `NO_COLOUR`
/// environment variable is truthy; likewise, if `kindly`'s output is piped,
/// unless the `COLOR` or `COLOUR` environment variable is `always`.
///
@external(javascript, "./kindly_ffi.ts", "ansi")
pub fn ansi(to content: String, apply styles: List(Int)) -> String

/// Runs the given external binary with any given arguments.
///
/// The command is executed as transparently as possible (capturing nothing).
///
/// Returns a `Result(Nil, Nil)` indicating the command's success.
///
@external(javascript, "./kindly_ffi.ts", "command")
pub fn command(run bin: String, with args: List(String)) -> TaskResult

/// Returns a function that discards its input and just runs `command` with the
/// given arguments.
///
pub fn just(run bin: String, with args: List(String)) -> fn(a) -> TaskResult {
  fn(_) { command(run: bin, with: args) }
}

/// A type for referring to Standard IO streams.
///
pub type IoStream {
  Stdin
  Stdout
  Stderr
}

/// Returns a `Bool` indicating whether the given Standard IO stream is a
/// terminal (TTY).
///
pub fn is_terminal(io_stream: IoStream) -> Bool {
  case io_stream {
    Stdin -> "stdin"
    Stdout -> "stdout"
    Stderr -> "stderr"
  }
  |> do_is_terminal
}

@external(javascript, "./kindly_ffi.ts", "is_terminal")
fn do_is_terminal(stream: String) -> Bool

/// Sets global state for `gleam_project` after trying to read a project name
/// from `gleam.toml`.
///
@external(javascript, "./kindly_ffi.ts", "set_gleam_project")
fn set_gleam_project(dir: String) -> Nil

/// Results in the value of the given environment variable on success, or `Nil`
/// if the variable is unset.
///
@external(javascript, "./kindly_ffi.ts", "get_env")
pub fn get_env(name name: String) -> Result(String, Nil)

/// Sets an environment variable to the given value.
///
@external(javascript, "./kindly_ffi.ts", "set_env")
pub fn set_env(name name: String, value value: String) -> Nil

/// Ensures the given environment variable is no longer set.
///
@external(javascript, "./kindly_ffi.ts", "unset_env")
pub fn unset_env(name name: String) -> Nil

/// Returns a monotonic timestamp for the current time in milliseconds, rounded
/// down.
///
@external(javascript, "./kindly_ffi.ts", "now")
pub fn now() -> Int

/// Converts a Gleam `Option(a)` to a TypeScript `a | undefined`.
///
/// Exported here so it works after bundling.
///
@external(javascript, "./kindly_ffi.ts", "option_to_optional")
@internal
pub fn option_to_optional(option: Option(a)) -> a
