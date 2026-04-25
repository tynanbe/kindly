//#region build/dev/javascript/prelude.d.mts
declare class CustomType {
  withFields(fields: any): any;
}
declare class Result$1 extends CustomType {
  static isResult(data: any): data is Result$1;
}
//#endregion
//#region build/dev/javascript/gleam_stdlib/gleam/option.d.mts
declare class Some extends CustomType {
  constructor($0: any);
  0: any;
}
declare class None extends CustomType {}
//#endregion
//#region build/dev/javascript/kindly/kindly_ffi.d.ts
type Nil = undefined;
declare const Nil: undefined;
/**
 * `Result` represents the result of something that may succeed or not. `Ok`
 * means it was successful, `Error` means it was not successful.
 */
type Result<T, E> = Omit<Result$1<T, E>, "__gleam">;
/**
 * Converts a Gleam `Option(a)` to a TypeScript `a | undefined`.
 *
 * Exported here so it works after bundling.
 *
 * @internal
 */
declare function option_to_optional<a>(option: Some<a> | None): a | Nil;
/**
 * Results in the value of the given environment variable on success, or
 * `undefined` if the variable is unset.
 */
declare function get_env(name: string): Result<string, Nil>;
/**
 * Sets an environment variable to the given value.
 */
declare function set_env(name: string, value: string): Nil;
/**
 * Ensures the given environment variable is no longer set.
 */
declare function unset_env(name: string): Nil;
/**
 * Returns a monotonic timestamp for the current time in milliseconds, rounded
 * down.
 */
declare function now(): number;
/**
 * Returns the given `content` with ANSI `styles` applied, ending with a style
 * reset.
 *
 * Returns the given `content` unstyled when the `NO_COLOR` or `NO_COLOUR`
 * environment variable is truthy; likewise, if `kindly`'s output is piped to
 * `stdin`, unless the `COLOR` or `COLOUR` environment variable is `always`.
 */
declare function ansi(content: string, style: Iterable<number> | number, ...styles: Array<number>): string;
/**
 * Runs the given external binary with any given arguments.
 *
 * The command is executed as transparently as possible (capturing nothing).
 *
 * Promises to return a `Result<undefined, undefined>` indicating the command's
 * success.
 */
declare function command(bin: string, arg: Iterable<string> | string, ...args: Array<string>): Promise<Result<Nil, Nil>>;
//#endregion
//#region build/dev/javascript/kindly/kindly.d.mts
/**
 * Returns a function that styles a `String` with the given ANSI codes.
 */
declare function styler(styles: any): (content: any) => string;
/**
 * Returns Kindly's default display `Theme`.
 *
 * This theme uses a selection of the terminal's configured colours.
 */
declare function default_theme(): Theme;
/**
 * Promises to return an `Error(Nil)` result. Useful for ending a multistep
 * `Task` in failure.
 */
declare function reject(): any;
/**
 * Returns a `Bool` indicating whether the given Standard IO stream is a
 * terminal (TTY).
 */
declare function is_terminal(io_stream: any): boolean;
/**
 * Returns a new Kindly `Handbook` with the given project name.
 */
declare function handbook(name: any): Handbook;
/**
 * Finds a `Handbook` or interactively tries to write a new one.
 *
 * @ignore
 */
declare function main(): any;
/**
 * Applies the given `Theme` to Kindly output.
 */
declare function theme(handbook: any, theme: any): Handbook;
/**
 * Returns a Gleam-inspired `Theme`.
 */
declare function gleam_theme(): Theme;
/**
 * Returns a `Theme` that uses the terminal's default display style.
 */
declare function plain_theme(): Theme;
/**
 * Adds a `Task` to the `Handbook`, differing from a standard task in that its
 * `action` is given the handbook's complete list of tasks in addition to any
 * runtime arguments.
 *
 * As with `task`, the given `action` is also provided a `List` of argument
 * strings and must return a `Promise(Result(Nil, Nil))` indicating success.
 */
declare function task_with_tasks(handbook: any, doc: any, tags: any, action: any): Handbook;
/**
 * Adds a `Task` to the `Handbook`.
 *
 * The given `action` is provided a `List` of argument strings and must return
 * a `Promise(Result(Nil, Nil))` indicating success.
 */
declare function task(handbook: any, doc: any, tags: any, action: any): Handbook;
/**
 * Adds a `Task` group to the `Handbook`.
 *
 * Kindly's main help menu compresses the display of grouped tasks under the
 * given `doc` and prepends the given `group_tags` for all grouped tasks.
 *
 * Conceptually similar to `map`, but with the aforementioned structural
 * conveniences.
 */
declare function group(handbook: any, doc: any, group_tags: any, f: any): Handbook;
/**
 * Modifies the `Handbook` with the given function.
 *
 * Can be used in the main `Handbook` builder pipeline, for example, to keep
 * tasks together with logic used to generate them.
 */
declare function map(handbook: any, f: any): Handbook;
/**
 * Calls and awaits the given function's `Result`. On success, promises to
 * return the callback function's `Result`. If either `Result` is an `Error`,
 * an `Error(Nil)` is promised instead.
 *
 * Enables chaining function calls such that each `step` can only run after the
 * previous `step` succeeded.
 */
declare function step(f: any, do$: any): any;
/**
 * Combines `step` and `command`, enabling function chains akin to shell `&&`
 * sequences.
 */
declare function command_step(bin: any, args: any, do$: any): any;
/**
 * Promises to return an `Ok(Nil)` result. Useful for ending a multistep `Task`
 * successfully.
 */
declare function resolve(): any;
/**
 * Returns a function that discards its input and just runs `command` with the
 * given arguments.
 */
declare function just(bin: any, args: any): (_: any) => Promise<Result<undefined, undefined>>;
declare class Theme extends CustomType {
  constructor(highlight: any, heading: any, tag: any, first_tag: any, given_tag: any, flag: any, parameter: any, time: any, tab: any);
  highlight: any;
  heading: any;
  tag: any;
  first_tag: any;
  given_tag: any;
  flag: any;
  parameter: any;
  time: any;
  tab: any;
}
declare function Theme$Theme(highlight: any, heading: any, tag: any, first_tag: any, given_tag: any, flag: any, parameter: any, time: any, tab: any): Theme;
declare function Theme$isTheme(value: any): value is Theme;
declare function Theme$Theme$highlight(value: any): any;
declare function Theme$Theme$0(value: any): any;
declare function Theme$Theme$heading(value: any): any;
declare function Theme$Theme$1(value: any): any;
declare function Theme$Theme$tag(value: any): any;
declare function Theme$Theme$2(value: any): any;
declare function Theme$Theme$first_tag(value: any): any;
declare function Theme$Theme$3(value: any): any;
declare function Theme$Theme$given_tag(value: any): any;
declare function Theme$Theme$4(value: any): any;
declare function Theme$Theme$flag(value: any): any;
declare function Theme$Theme$5(value: any): any;
declare function Theme$Theme$parameter(value: any): any;
declare function Theme$Theme$6(value: any): any;
declare function Theme$Theme$time(value: any): any;
declare function Theme$Theme$7(value: any): any;
declare function Theme$Theme$tab(value: any): any;
declare function Theme$Theme$8(value: any): any;
declare class Task extends CustomType {
  constructor(doc: any, tags: any, action: any, group_doc: any);
  doc: any;
  tags: any;
  action: any;
  group_doc: any;
}
declare function Task$Task(doc: any, tags: any, action: any, group_doc: any): Task;
declare function Task$isTask(value: any): value is Task;
declare function Task$Task$doc(value: any): any;
declare function Task$Task$0(value: any): any;
declare function Task$Task$tags(value: any): any;
declare function Task$Task$1(value: any): any;
declare function Task$Task$action(value: any): any;
declare function Task$Task$2(value: any): any;
declare function Task$Task$group_doc(value: any): any;
declare function Task$Task$3(value: any): any;
declare class Stdin extends CustomType {}
declare function IoStream$Stdin(): Stdin;
declare function IoStream$isStdin(value: any): value is Stdin;
declare class Stdout extends CustomType {}
declare function IoStream$Stdout(): Stdout;
declare function IoStream$isStdout(value: any): value is Stdout;
declare class Stderr extends CustomType {}
declare function IoStream$Stderr(): Stderr;
declare function IoStream$isStderr(value: any): value is Stderr;
declare class Handbook extends CustomType {
  constructor(name: any, tasks: any, theme: any, run: any);
  name: any;
  tasks: any;
  theme: any;
  run: any;
}
//#endregion
export { IoStream$Stderr, IoStream$Stdin, IoStream$Stdout, IoStream$isStderr, IoStream$isStdin, IoStream$isStdout, Stderr, Stdin, Stdout, Task, Task$Task, Task$Task$0, Task$Task$1, Task$Task$2, Task$Task$3, Task$Task$action, Task$Task$doc, Task$Task$group_doc, Task$Task$tags, Task$isTask, Theme, Theme$Theme, Theme$Theme$0, Theme$Theme$1, Theme$Theme$2, Theme$Theme$3, Theme$Theme$4, Theme$Theme$5, Theme$Theme$6, Theme$Theme$7, Theme$Theme$8, Theme$Theme$first_tag, Theme$Theme$flag, Theme$Theme$given_tag, Theme$Theme$heading, Theme$Theme$highlight, Theme$Theme$parameter, Theme$Theme$tab, Theme$Theme$tag, Theme$Theme$time, Theme$isTheme, ansi, command, command_step, default_theme, get_env, gleam_theme, group, handbook, is_terminal, just, main, map, now, option_to_optional, plain_theme, reject, resolve, set_env, step, styler, task, task_with_tasks, theme, unset_env };