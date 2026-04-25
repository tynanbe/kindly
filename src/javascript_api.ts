import * as kindly from "../priv/dist/kindly.js";
import {
  command,
  type List,
  type None,
  type Result,
  Result$Error,
  Result$isOk,
  Result$Ok,
  Result$Ok$0,
  type Some,
  toList,
} from "./kindly_ffi.ts";

export {
  ansi,
  command,
  get_env,
  is_terminal,
  just,
  now,
  type Result,
  set_env,
  styler,
  unset_env,
} from "./kindly_ffi.ts";

// Internal Gleam types and function signature assertions

type Handbook$ = ReturnType<typeof kindly.handbook>;

type Task$ = {
  doc: string;
  tags: Set<string>;
  action: (
    args: List<string>,
    tasks: List<Task$>,
  ) => TaskResult;
  group_doc: Option$<string>;
};

type TaskResult = Promise<Result<undefined, undefined>>;

type Theme$ = ReturnType<typeof kindly.Theme$Theme>;

type Option$<a> = Some<a> | None;

const option_to_optional = kindly.option_to_optional as unknown as <a>(
  option: Option$<a>,
) => a | undefined;

function toList$<a>(xs: Iterable<a>): List<a> {
  return toList([...xs]);
}

const handbook$ = kindly.handbook as unknown as (name: string) => Handbook$;

const theme$ = kindly.theme as unknown as (
  handbook: Handbook$,
  theme: Theme$,
) => Handbook$;

const task$ = kindly.task as unknown as (
  handbook: Handbook$,
  doc: string,
  tags: List<string>,
  action: (args: List<string>) => TaskResult,
) => Handbook$;

const task_with_tasks$ = kindly.task_with_tasks as unknown as (
  handbook: Handbook$,
  doc: string,
  tags: List<string>,
  action: (
    args: List<string>,
    tasks: List<Task$>,
  ) => TaskResult,
) => Handbook$;

const map$ = kindly.map as unknown as (
  handbook: Handbook$,
  f: (handbook: Handbook$) => Handbook$,
) => Handbook$;

const group$ = kindly.group as unknown as (
  handbook: Handbook$,
  doc: string,
  group_tags: List<string>,
  f: (handbook: Handbook$) => Handbook$,
) => Handbook$;

// Public API

/**
 * A type for styles applied to Kindly output.
 */
export type Theme = {
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
export const default_theme = kindly.default_theme as () => Theme;

/**
 * Returns a Gleam-inspired `Theme`.
 */
export const gleam_theme = kindly.gleam_theme as () => Theme;

/**
 * Returns a `Theme` that uses the terminal's default display style.
 */
export const plain_theme = kindly.plain_theme as () => Theme;

/**
 * The main Kindly unit type.
 */
export type Task = {
  doc: string;
  tags: Iterable<string>;
  action: (args: Array<string>) => TaskResult;
};

/**
 * An input type for `Handbook.task_with_tasks`.
 */
export type TaskWithTasks = {
  doc: string;
  tags: Iterable<string>;
  action: (
    args: Array<string>,
    tasks: Array<{
      doc: Task$["doc"];
      tags: Task$["tags"];
      action: Task$["action"];
      group_doc?: string;
    }>,
  ) => TaskResult;
};

/**
 * An input type for `Handbook.group`.
 */
export type Group = {
  doc: string;
  tags: Iterable<string>;
  apply: (handbook: Handbook) => Handbook;
};

/**
 * An input type for `Handbook.map`.
 */
export type Map = {
  apply: (handbook: Handbook) => Handbook;
};

/**
 * A Kindly `Handbook`.
 */
class Handbook {
  private handbook: Handbook$;

  constructor(name: string) {
    this.handbook = handbook$(name);
  }

  /**
   * Applies the given `Theme` to Kindly output.
   */
  theme(theme: Theme): Handbook {
    const new_theme: Theme$ = kindly.default_theme();
    for (const [key, value] of Object.entries(theme)) {
      if (key in new_theme) {
        new_theme[key as keyof Theme$] = value;
      }
    }

    this.handbook = theme$(this.handbook, new_theme);

    return this;
  }

  /**
   * Adds a `Task` to the `Handbook`.
   *
   * The given `action` is provided an `Array` of argument strings and must
   * return a `Promise<Result<undefined, undefined>>` indicating success.
   */
  task(
    doc: Task["doc"],
    tags: Task["tags"],
    action: Task["action"],
  ): Handbook;
  task(def: Task): Handbook;
  task(
    doc_or_task: Task["doc"] | Task,
    maybe_tags?: Task["tags"],
    maybe_action?: Task["action"],
  ): Handbook {
    const { doc, tags, action } = typeof doc_or_task === "object"
      ? doc_or_task
      : {
        doc: doc_or_task,
        tags: maybe_tags as Task["tags"],
        action: maybe_action as Task["action"],
      };

    this.handbook = task$(
      this.handbook,
      doc,
      toList$(tags),
      (args) => action([...args]),
    );

    return this;
  }

  /**
   * Adds a `Task` to the `Handbook`, differing from a standard task in that its
   * `action` is given the handbook's complete list of tasks in addition to any
   * runtime arguments.
   *
   * As with `task`, the given `action` is provided an `Array` of argument
   * strings and must return a `Promise<Result<undefined, undefined>>`
   * indicating success.
   */
  task_with_tasks(
    doc: TaskWithTasks["doc"],
    tags: TaskWithTasks["tags"],
    action: TaskWithTasks["action"],
  ): Handbook;
  task_with_tasks(def: TaskWithTasks): Handbook;
  task_with_tasks(
    doc_or_task: TaskWithTasks["doc"] | TaskWithTasks,
    maybe_tags?: TaskWithTasks["tags"],
    maybe_action?: TaskWithTasks["action"],
  ): Handbook {
    const { doc, tags, action } = typeof doc_or_task === "object"
      ? doc_or_task
      : {
        doc: doc_or_task,
        tags: maybe_tags as TaskWithTasks["tags"],
        action: maybe_action as TaskWithTasks["action"],
      };

    this.handbook = task_with_tasks$(
      this.handbook,
      doc,
      toList$(tags),
      (args, tasks) =>
        action(
          [...args],
          [...tasks].map((task) =>
            Object.assign({}, task, {
              group_doc: option_to_optional(task.group_doc),
            })
          ),
        ),
    );

    return this;
  }

  /**
   * Adds a `Task` group to the `Handbook`.
   *
   * Kindly's main help menu compresses the display of grouped tasks under the
   * given `doc` and prepends the given `tags` for all grouped tasks.
   *
   * Conceptually similar to `map`, but with the aforementioned structural
   * conveniences.
   */
  group(
    doc: Group["doc"],
    tags: Group["tags"],
    apply: Group["apply"],
  ): Handbook;
  group(def: Group): Handbook;
  group(
    doc_or_group: Group["doc"] | Group,
    maybe_tags?: Group["tags"],
    maybe_apply?: Group["apply"],
  ): Handbook {
    const { doc, tags, apply: f } = typeof doc_or_group === "object"
      ? doc_or_group
      : {
        doc: doc_or_group,
        tags: maybe_tags as Group["tags"],
        apply: maybe_apply as Group["apply"],
      };

    this.handbook = group$(
      this.handbook,
      doc,
      toList$(tags),
      (handbook$) => {
        this.handbook = handbook$;
        return f(this).handbook;
      },
    );

    return this;
  }

  /**
   * Modifies the `Handbook` with the given function.
   *
   * Can be used in the main `Handbook` builder pipeline, for example, to keep
   * tasks together with logic used to generate them.
   */
  map(apply: Map["apply"]): Handbook;
  map(def: Map): Handbook;
  map(apply_or_map: Map["apply"] | Map): Handbook {
    const { apply: f } = typeof apply_or_map === "object"
      ? apply_or_map
      : { apply: apply_or_map };

    this.handbook = map$(this.handbook, (handbook$) => {
      this.handbook = handbook$;
      return f(this).handbook;
    });

    return this;
  }
}

/**
 * Returns a new Kindly `Handbook` with the given project name.
 */
export function handbook(name: string): Handbook;
export function handbook(def: { for: string }): Handbook;
export function handbook(name_or_def: string | { for: string }): Handbook {
  const { for: name } = typeof name_or_def === "object"
    ? name_or_def
    : { for: name_or_def };

  return new Handbook(name);
}

/**
 * A multistep `Task` pipeline.
 */
class Steps<a = unknown, b = unknown> {
  protected readonly steps: () => Promise<Result<a, b>>;

  constructor(f: () => Promise<Result<a, b>>) {
    this.steps = f;
  }

  /**
   * Calls and awaits the given function's `Result`. On success, promises to
   * return the callback function's `Result`. If either `Result` is an `Error`,
   * an `Error<Nil>` is promised instead.
   *
   * Enables chaining function calls such that each `step` can only run after
   * the previous `step` succeeded.
   */
  step<c, d>(then: (value: a) => Promise<Result<c, d>>): Steps<c, d> {
    return new Steps(() => do_step(this.steps, then));
  }

  /**
   * Combines `step` and `command`, enabling function chains akin to shell `&&`
   * sequences.
   */
  command_step(
    bin: string,
    arg: Iterable<string> | string,
    ...args: Array<string>
  ): Steps<undefined, undefined> {
    return this.step((_value) => command(bin, arg, ...args));
  }

  /**
   * Promises to return an `Ok<Nil>` result. Useful for ending a multistep
   * `Task` successfully.
   */
  resolve(): TaskResult {
    return do_step(this.steps, (_value) => resolve());
  }

  /**
   * Promises to return an `Error<Nil>` result. Useful for ending a multistep
   * `Task` in failure.
   */
  reject(): TaskResult {
    return do_step(this.steps, (_value) => reject());
  }
}

/**
 * Calls and awaits the given function's `Result`. On success, promises to
 * return the callback function's `Result`. If either `Result` is an `Error`,
 * an `Error<Nil>` is promised instead.
 *
 * Enables chaining function calls such that each `step` can only run after the
 * previous `step` succeeded.
 */
export function step<a, b>(f: () => Promise<Result<a, b>>): Steps<a, b> {
  return new Steps(f);
}

async function do_step<a, b, c, d>(
  f: () => Promise<Result<a, b>>,
  then: (value: a) => Promise<Result<c, d>>,
): Promise<Result<c, undefined>> {
  const result = await f();

  if (!Result$isOk(result)) {
    return Result$Error(undefined);
  }

  const next = await then(Result$Ok$0(result) as a);

  return Result$isOk(next)
    ? next as Result<c, undefined>
    : Result$Error(undefined);
}

/**
 * Combines `step` and `command`, enabling function chains akin to shell `&&`
 * sequences.
 */
export function command_step(
  bin: string,
  arg: Iterable<string> | string,
  ...args: Array<string>
): Steps<undefined, undefined> {
  return new Steps(() => command(bin, arg, ...args));
}

/**
 * Promises to return an `Ok<Nil>` result. Useful for ending a multistep `Task`
 * successfully.
 */
export function resolve(): TaskResult {
  return Promise.resolve(Result$Ok(undefined));
}

/**
 * Promises to return an `Error<Nil>` result. Useful for ending a multistep
 * `Task` in failure.
 */
export function reject(): TaskResult {
  return Promise.resolve(Result$Error(undefined));
}
