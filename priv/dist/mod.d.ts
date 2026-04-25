//#region prelude.d.mts
declare class CustomType {
  withFields(fields: any): any;
}
declare class List {
  static fromArray(array: any, tail: any): any;
  toArray(): any[];
  atLeastLength(desired: any): boolean;
  hasLength(desired: any): boolean;
  countLength(): number;
  [Symbol.iterator](): ListIterator;
}
declare class Result$1 extends CustomType {
  static isResult(data: any): data is Result$1;
}
declare class ListIterator {
  constructor(current: any);
  next(): {
    done: boolean;
    value?: undefined;
  } | {
    value: any;
    done: boolean;
  };
  #private;
}
//#endregion
//#region gleam_stdlib/gleam/option.d.mts
declare class Some extends CustomType {
  constructor($0: any);
  0: any;
}
declare class None extends CustomType {}
//#endregion
//#region src/kindly_ffi.d.ts
type Nil = undefined;
declare const Nil: undefined;
/**
 * `Result` represents the result of something that may succeed or not. `Ok`
 * means it was successful, `Error` means it was not successful.
 */
type Result<T, E> = Omit<Result$1<T, E>, "__gleam">;
/**
 * A type for Kindly's global runtime state.
 */
type Kindly = {
  description: string;
  gleam_project: string;
  handbook_module: string;
  is_terminal: {
    stdin: boolean;
    stdout: boolean;
    stderr: boolean;
  };
  project_root: string;
  should_style: string;
  stdin: string;
  version: string;
};
declare let Kindly: Kindly | undefined;
/**
 * Sets global state for `gleam_project` after trying to read a project name
 * from `gleam.toml`.
 *
 * @internal
 */
/**
 * Returns a `Bool` indicating whether the given Standard IO stream is a
 * terminal (TTY).
 */
declare function is_terminal(stream: keyof Kindly["is_terminal"]): boolean;
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
/**
 * Returns a function that discards its arguments and just runs `command` with
 * the given arguments.
 */
declare function just(bin: string, arg: Iterable<string> | string, ...args: Array<string>): () => Promise<Result<Nil, Nil>>;
/**
 * Returns a function that styles a `string` with the given ANSI codes.
 */
declare function styler(style: Iterable<number> | number, ...styles: Array<number>): (content: string) => string;
declare namespace javascript_api_d_exports {
  export { Group, Map, Result, Task, TaskWithTasks, Theme, ansi, command, command_step, default_theme, get_env, gleam_theme, handbook, is_terminal, just, now, plain_theme, reject, resolve, set_env, step, styler, unset_env };
}
type Task$ = {
  doc: string;
  tags: Set<string>;
  action: (args: List<string>, tasks: List<Task$>) => TaskResult;
  group_doc: Option$<string>;
};
type TaskResult = Promise<Result<undefined, undefined>>;
type Option$<a> = Some<a> | None;
/**
 * A type for styles applied to Kindly output.
 */
type Theme = {
  highlight: (content: string) => string;
  heading: (content: string) => string;
  tag: (content: string) => string;
  first_tag: (content: string) => string;
  given_tag: (content: string) => string;
  flag: (content: string) => string;
  parameter: (content: string) => string;
  time: (content: string) => string;
  tab: string;
};
/**
 * Returns Kindly's default display `Theme`.
 *
 * This theme uses a selection of the terminal's configured colours.
 */
declare const default_theme: () => Theme;
/**
 * Returns a Gleam-inspired `Theme`.
 */
declare const gleam_theme: () => Theme;
/**
 * Returns a `Theme` that uses the terminal's default display style.
 */
declare const plain_theme: () => Theme;
/**
 * The main Kindly unit type.
 */
type Task = {
  doc: string;
  tags: Iterable<string>;
  action: (args: Array<string>) => TaskResult;
};
/**
 * An input type for `Handbook.task_with_tasks`.
 */
type TaskWithTasks = {
  doc: string;
  tags: Iterable<string>;
  action: (args: Array<string>, tasks: Array<{
    doc: Task$["doc"];
    tags: Task$["tags"];
    action: Task$["action"];
    group_doc?: string;
  }>) => TaskResult;
};
/**
 * An input type for `Handbook.group`.
 */
type Group = {
  doc: string;
  tags: Iterable<string>;
  apply: (handbook: Handbook) => Handbook;
};
/**
 * An input type for `Handbook.map`.
 */
type Map = {
  apply: (handbook: Handbook) => Handbook;
};
/**
 * A Kindly `Handbook`.
 */
declare class Handbook {
  private handbook;
  constructor(name: string);
  /**
   * Applies the given `Theme` to Kindly output.
   */
  theme(theme: Theme): Handbook;
  /**
   * Adds a `Task` to the `Handbook`.
   *
   * The given `action` is provided an `Array` of argument strings and must
   * return a `Promise<Result<undefined, undefined>>` indicating success.
   */
  task(doc: Task["doc"], tags: Task["tags"], action: Task["action"]): Handbook;
  task(def: Task): Handbook;
  /**
   * Adds a `Task` to the `Handbook`, differing from a standard task in that its
   * `action` is given the handbook's complete list of tasks in addition to any
   * runtime arguments.
   *
   * As with `task`, the given `action` is provided an `Array` of argument
   * strings and must return a `Promise<Result<undefined, undefined>>`
   * indicating success.
   */
  task_with_tasks(doc: TaskWithTasks["doc"], tags: TaskWithTasks["tags"], action: TaskWithTasks["action"]): Handbook;
  task_with_tasks(def: TaskWithTasks): Handbook;
  /**
   * Adds a `Task` group to the `Handbook`.
   *
   * Kindly's main help menu compresses the display of grouped tasks under the
   * given `doc` and prepends the given `tags` for all grouped tasks.
   *
   * Conceptually similar to `map`, but with the aforementioned structural
   * conveniences.
   */
  group(doc: Group["doc"], tags: Group["tags"], apply: Group["apply"]): Handbook;
  group(def: Group): Handbook;
  /**
   * Modifies the `Handbook` with the given function.
   *
   * Can be used in the main `Handbook` builder pipeline, for example, to keep
   * tasks together with logic used to generate them.
   */
  map(apply: Map["apply"]): Handbook;
  map(def: Map): Handbook;
}
/**
 * Returns a new Kindly `Handbook` with the given project name.
 */
declare function handbook(name: string): Handbook;
declare function handbook(def: {
  for: string;
}): Handbook;
/**
 * A multistep `Task` pipeline.
 */
declare class Steps<a = unknown, b = unknown> {
  protected readonly steps: () => Promise<Result<a, b>>;
  constructor(f: () => Promise<Result<a, b>>);
  /**
   * Calls and awaits the given function's `Result`. On success, promises to
   * return the callback function's `Result`. If either `Result` is an `Error`,
   * an `Error<Nil>` is promised instead.
   *
   * Enables chaining function calls such that each `step` can only run after
   * the previous `step` succeeded.
   */
  step<c, d>(then: (value: a) => Promise<Result<c, d>>): Steps<c, d>;
  /**
   * Combines `step` and `command`, enabling function chains akin to shell `&&`
   * sequences.
   */
  command_step(bin: string, arg: Iterable<string> | string, ...args: Array<string>): Steps<undefined, undefined>;
  /**
   * Promises to return an `Ok<Nil>` result. Useful for ending a multistep
   * `Task` successfully.
   */
  resolve(): TaskResult;
  /**
   * Promises to return an `Error<Nil>` result. Useful for ending a multistep
   * `Task` in failure.
   */
  reject(): TaskResult;
}
/**
 * Calls and awaits the given function's `Result`. On success, promises to
 * return the callback function's `Result`. If either `Result` is an `Error`,
 * an `Error<Nil>` is promised instead.
 *
 * Enables chaining function calls such that each `step` can only run after the
 * previous `step` succeeded.
 */
declare function step<a, b>(f: () => Promise<Result<a, b>>): Steps<a, b>;
/**
 * Combines `step` and `command`, enabling function chains akin to shell `&&`
 * sequences.
 */
declare function command_step(bin: string, arg: Iterable<string> | string, ...args: Array<string>): Steps<undefined, undefined>;
/**
 * Promises to return an `Ok<Nil>` result. Useful for ending a multistep `Task`
 * successfully.
 */
declare function resolve(): TaskResult;
/**
 * Promises to return an `Error<Nil>` result. Useful for ending a multistep
 * `Task` in failure.
 */
declare function reject(): TaskResult;
//#endregion
export { Group, Map, type Result, Task, TaskWithTasks, Theme, ansi, command, command_step, javascript_api_d_exports as default, default_theme, get_env, gleam_theme, handbook, is_terminal, just, now, plain_theme, reject, resolve, set_env, step, styler, unset_env };