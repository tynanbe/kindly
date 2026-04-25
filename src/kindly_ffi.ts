import path from "node:path";
import type { List, Result as Result$ } from "../prelude.d.mts";
// TODO: toList
import { Result$Error, Result$Ok, toList } from "../prelude.mjs";
// TODO: review
import type { None, Some } from "../gleam_stdlib/gleam/option.d.mts";
import { unwrap as option_unwrap } from "../gleam_stdlib/gleam/option.mjs";
import generated from "./generated.ts";

// TODO: review
export type { List } from "../prelude.d.mts";
export {
  Result$Error,
  Result$Error$0,
  Result$isError,
  Result$isOk,
  Result$Ok,
  Result$Ok$0,
  toList,
} from "../prelude.mjs";
export type { None, Some } from "../gleam_stdlib/gleam/option.d.mts";

const { events, fs, process, spawn } = await (async () =>
  !globalThis.Deno
    ? {
      // Imports for Bun, Node.js
      events: await import("node:events"),
      fs: await import("node:fs"),
      process: (await import("node:process")).default,
      spawn: (await import("node:child_process")).spawn,
    }
    : {})();

export type Never = never;

type Nil = undefined;
const Nil = undefined;

/**
 * `Result` represents the result of something that may succeed or not. `Ok`
 * means it was successful, `Error` means it was not successful.
 */
export type Result<T, E> = Omit<Result$<T, E>, "__gleam">;

const gleam_handbook: [string, (name: string) => string] = [
  path.join("dev", "handbook.gleam"),
  (name: string) =>
    path.join("build", "dev", "javascript", name, "handbook.mjs"),
];
const handbook_modules: Array<[string, (name: string) => string | Nil]> = [
  gleam_handbook,
  ["handbook.ts", () => Nil],
  ["handbook.mjs", () => Nil],
  ["handbook.js", () => Nil],
];

const project_root_indicators = [
  ".git",
  ".jj",
  "biome.json",
  "biome.jsonc",
  "bunfig.toml",
  "deno.json",
  "deno.jsonc",
  "erlang.mk",
  "gleam.toml",
  "jsconfig.json",
  "jsr.json",
  "jsr.jsonc",
  "mix.exs",
  "package.json",
  "rebar.config",
  "tsconfig.json",
];

const bold = 1;
const red = 31;

/**
 * A type for Kindly's global runtime state.
 */
type Kindly = {
  description: string;
  gleam_project: string;
  handbook_module: string;
  is_terminal: { stdin: boolean; stdout: boolean; stderr: boolean };
  project_root: string;
  should_style: string;
  stdin: string;
  version: string;
};

const kindly_global = globalThis as { Kindly?: Kindly };

let Kindly = kindly_global.Kindly;

if (!Kindly) {
  const decoder = new TextDecoder();

  kindly_global.Kindly = Kindly = {
    should_style: env("NO_COLOR") || env("NO_COLOUR")
      ? "never"
      : env("COLOR") ?? env("COLOUR") ?? "auto",
    is_terminal: {
      stdin: (() => {
        try {
          return process ? process.stdin.isTTY : Deno.stdin.isTerminal();
        } catch {
          return false;
        }
      })(),
      stdout: process ? process.stdout.isTTY : Deno.stdout.isTerminal(),
      stderr: process ? process.stderr.isTTY : Deno.stderr.isTerminal(),
    },
    stdin: "",
    version: decoder.decode(generated.version),
    description: decoder.decode(generated.description),
    project_root: current_directory(),
    gleam_project: "",
    handbook_module: "",
  };

  // Save initial standard input content
  if (!Kindly.is_terminal.stdin) {
    try {
      for await (const chunk of process ? process.stdin : Deno.stdin.readable) {
        Kindly.stdin += decoder.decode(chunk);
      }
    } catch { /* Unreadable stdin */ }
  }

  // Search for and save project root and handbook
  let dir = Kindly.project_root;
  let seen = "";
  search: while (dir !== seen) {
    for (const [handbook, compiled] of handbook_modules) {
      if (file_is_readable(path.join(dir, handbook))) {
        set_gleam_project(dir);
        Kindly.project_root = dir;
        Kindly.handbook_module = path.join(
          dir,
          compiled(Kindly.gleam_project) ?? handbook,
        );
        break search;
      }
      // Look one or two directories up from any project root indicator to
      // detect a monorepo
      if (
        Kindly.project_root !== current_directory() &&
        dir !== path_dirname(Kindly.project_root) &&
        dir !== path_dirname(path_dirname(Kindly.project_root))
      ) {
        break search;
      }
      for (const indicator of project_root_indicators) {
        if (file_is_readable(path.join(dir, indicator))) {
          const { project_root } = Kindly;
          Kindly.project_root = dir;
          if (project_root !== current_directory()) {
            break search;
          }
          break;
        }
      }
    }
    seen = dir;
    dir = path.dirname(dir);
  }
}

function env(name: string): string | Nil {
  return process ? process.env[name] : Deno.env.get(name);
}

/**
 * Sets global state for `gleam_project` after trying to read a project name
 * from `gleam.toml`.
 *
 * @internal
 */
export function set_gleam_project(dir: string): Nil {
  try {
    const gleam_config = path.join(dir, "gleam.toml");

    const content = fs
      ? fs.readFileSync(gleam_config, { encoding: "utf8" })
      : Deno.readTextFileSync(gleam_config);

    const re = new RegExp(
      ["(?:^|\n)", "name", "=", `["'](.*?)["']`, "(?:\n|$)"]
        .join("(?: |\t)*"),
    );

    Kindly!.gleam_project = content.match(re)?.[1] ?? "";
  } catch { /* Unreadable Gleam config */ }
}

/**
 * Converts a Gleam `Option(a)` to a TypeScript `a | undefined`.
 *
 * Exported here so it works after bundling.
 *
 * @internal
 */
export function option_to_optional<a>(option: Some<a> | None): a | Nil {
  return option_unwrap(option, Nil);
}

/**
 * Returns a `Bool` indicating whether the given Standard IO stream is a
 * terminal (TTY).
 */
export function is_terminal(stream: keyof Kindly["is_terminal"]): boolean {
  return Kindly!.is_terminal[stream];
}

/**
 * Returns Kindly's display description.
 *
 * @internal
 */
export function kindly_description(): string {
  return Kindly!.description;
}

/**
 * Returns Kindly's display version.
 *
 * @internal
 */
export function kindly_version(): string {
  return Kindly!.version;
}

/**
 * Returns the name of the detected Gleam project.
 *
 * @internal
 */
export function gleam_project(): string {
  return Kindly!.gleam_project;
}

/**
 * Returns the current project root.
 *
 * @internal
 */
export function project_root(): string {
  return Kindly!.project_root;
}

/**
 * Returns the current handbook entrypoint.
 *
 * @internal
 */
export function get_handbook(): Result<() => Promise<never> | never, Nil> {
  const { handbook_module } = Kindly!;
  if (
    handbook_module.endsWith(gleam_handbook[1](Kindly!.gleam_project)) &&
    !main_module_is_gleam()
  ) {
    command(
      "gleam",
      "build",
      "--target=javascript",
      "--no-print-progress",
    );
  }
  return handbook_module
    ? Result$Ok(async () => {
      try {
        const mod = await import(handbook_module) as unknown;
        if (typeof mod !== "object" || mod === null) {
          throw new Error("can’t run handbook");
        }
        let x: unknown;
        if ("main" in mod && mod.main instanceof Function) {
          x = mod.main();
        } else if ("default" in mod) {
          x = mod.default;
        }
        if (!(x instanceof Object)) {
          throw new Error("can’t run handbook");
        }
        const handbook = "handbook" in x ? x.handbook : x;
        if (!(handbook instanceof Object)) {
          throw new Error("can’t run handbook");
        }
        if ("run" in handbook && handbook.run instanceof Function) {
          handbook.run();
        }
      } catch (error) {
        console.error(
          ansi("error", bold, red) +
            ansi(
              ": " +
                (error instanceof Error ? error.message : "can’t run handbook"),
              bold,
            ),
        );
      }
    })
    : Result$Error(Nil);
}

/**
 * Returns a script for adding Kindly command completion to the given shell.
 *
 * @internal
 */
export function completion_script(
  shell: keyof typeof generated["completion"],
): Result<string, Nil> {
  const script = new TextDecoder().decode(generated.completion[shell]);
  return script ? Result$Ok(script) : Result$Error(Nil);
}

/**
 * Returns a `boolean` indicating whether the given tag is valid, e.g. it
 * doesn't start with a "`-`" or contain any spaces.
 *
 * @internal
 */
export function tag_is_valid(tag: string): boolean {
  return !tag.startsWith("-") && /^\S+$/.test(tag);
}

/**
 * Returns the terminal width, guessing, if necessary.
 *
 * @internal
 */
export function terminal_width(): number {
  const guess = 80;
  let columns = 0;

  try {
    columns = (process ? process.stdout : Deno.consoleSize()).columns ?? 0;
  } catch { /* Unreadable columns */ }

  if (!columns) {
    columns = parseInt(env("COLUMNS") ?? `${guess}`);
  }

  return columns > 0 ? columns : guess;
}

/**
 * Results in the value of the given environment variable on success, or
 * `undefined` if the variable is unset.
 */
export function get_env(name: string): Result<string, Nil> {
  const value = env(name);
  return Nil !== value ? Result$Ok(value) : Result$Error(value);
}

/**
 * Sets an environment variable to the given value.
 */
export function set_env(name: string, value: string): Nil {
  if (process) {
    process.env[name] = value;
  } else {
    Deno.env.set(name, value);
  }
}

/**
 * Ensures the given environment variable is no longer set.
 */
export function unset_env(name: string): Nil {
  if (process) {
    delete process.env[name];
  } else {
    Deno.env.delete(name);
  }
}

/**
 * Returns a monotonic timestamp for the current time in milliseconds, rounded
 * down.
 */
export function now(): number {
  return Math.floor(globalThis.performance.now());
}

/**
 * Returns the arguments passed to the current program.
 */
export function args(): List<string> {
  let args = process ? process.argv.slice(2) : Deno.args;
  if (Kindly!.stdin && !args.includes("--")) {
    const double_quoted_arg = '"((?:\\\\"|[^"])*?)"';
    const single_quoted_arg = "'((?:\\\\'|[^'])*?)'";
    const unquoted_arg = "(\\S+)";
    const re = RegExp(
      [
        double_quoted_arg,
        single_quoted_arg,
        unquoted_arg,
      ]
        .join("|"),
      "g",
    );
    args = args.concat(
      args.length ? "--" : [],
      Kindly!.stdin.match(re) ?? [],
    );
  }
  return toList(args);
}

/**
 * Returns the given `content` with ANSI `styles` applied, ending with a style
 * reset.
 *
 * Returns the given `content` unstyled when the `NO_COLOR` or `NO_COLOUR`
 * environment variable is truthy; likewise, if `kindly`'s output is piped to
 * `stdin`, unless the `COLOR` or `COLOUR` environment variable is `always`.
 */
export function ansi(
  content: string,
  style: Iterable<number> | number,
  ...styles: Array<number>
): string {
  if (
    "never" === Kindly!.should_style ||
    ("always" !== Kindly!.should_style && !is_terminal("stdout"))
  ) {
    return content;
  }
  style = typeof style === "number" ? [style] : style;
  styles = [...style, ...styles];
  if (!styles.length) {
    return content;
  }
  const start = styles.length ? "\u{1b}[" + styles.join(";") + "m" : "";
  const end = "\u{1b}[m\u{1b}[K";
  return start + content + (content.endsWith(end) ? "" : end);
}

/**
 * Runs the given external binary with any given arguments.
 *
 * The command is executed as transparently as possible (capturing nothing).
 *
 * Promises to return a `Result<undefined, undefined>` indicating the command's
 * success.
 */
export async function command(
  bin: string,
  arg: Iterable<string> | string,
  ...args: Array<string>
): Promise<Result<Nil, Nil>> {
  arg = typeof arg === "string" ? [arg] : arg;
  args = [...arg, ...args];

  // Pass Ctrl+C to spawned process
  const pass_on = () => Nil;
  if (events && process) {
    process.on("SIGINT", pass_on);
  } else {
    Deno.addSignalListener("SIGINT", pass_on);
  }

  // Run the command
  try {
    const cwd = ".";
    const stdin = "inherit";
    const stdout = "inherit";
    const stderr = "inherit";

    if (spawn) {
      return await new Promise((resolve) => {
        spawn(bin, args, {
          cwd,
          env: process.env,
          stdio: [stdin, stdout, stderr],
          windowsHide: true,
        }).on("close", (code) => {
          resolve(!(code ?? 1) ? Result$Ok(Nil) : Result$Error(Nil));
        });
      });
    } else {
      return (await new Deno.Command(bin, {
          args,
          cwd,
          env: Deno.env.toObject(),
          stdin,
          stdout,
          stderr,
        })
          .output())
          .success
        ? Result$Ok(Nil)
        : Result$Error(Nil);
    }
  } catch {
    return Result$Error(Nil);
  } finally {
    if (events && process) {
      process.off("SIGINT", pass_on);
    } else {
      Deno.removeSignalListener("SIGINT", pass_on);
    }
  }
}

/**
 * Returns a function that discards its arguments and just runs `command` with
 * the given arguments.
 */
export function just(
  bin: string,
  arg: Iterable<string> | string,
  ...args: Array<string>
): () => Promise<Result<Nil, Nil>> {
  return () => command(bin, arg, ...args);
}

/**
 * Exits the current process with the given status code.
 */
export function exit(code: number): Promise<never> {
  return Promise.resolve(process ? process.exit(code) : Deno.exit(code));
}

/**
 * Converts a task-like function that could `throw` into a `Result`, dropping
 * the success payload upon normalizing the foreign task results produced by the
 * given function.
 */
export async function rescue<a>(
  f: () => Promise<Result<a, Nil>> | Result<a, Nil>,
): Promise<Result<Nil, Nil>> {
  try {
    return normalize_foreign_task_result(await f());
  } catch (error) {
    // TODO: is this OK here or does it mess some output?
    console.error(
      ansi("error", bold, red) +
        ansi(
          ": " +
            String(error instanceof Error ? error.message : error),
          bold,
        ),
    );

    return Result$Error(Nil);
  }
}

/**
 * Returns a `Result<Nil, Nil>` based on the given `value`, which could be a
 * `Result` from a user's handbook.
 *
 * This bridges foreign Gleam `Result` values across bundled/dynamically
 * imported JS module boundaries.
 *
 * Official `Result$isOk`/`Result$isError` are not usable here because they rely
 * on `instanceof`. This intentionally uses deprecated `isOk()` until Gleam
 * exposes a cross-bundle-safe runtime tag check.
 *
 * @TODO: Revise when Gleam removes deprecated `Ok { isOk() }`.
 */
function normalize_foreign_task_result(value: unknown): Result<Nil, Nil> {
  if (!is_foreign_result_like(value)) {
    throw new Error("Expected return type to be Result<Nil, Nil>");
  }

  return value.isOk() ? Result$Ok(Nil) : Result$Error(Nil);
}

function is_foreign_result_like(
  value: unknown,
): value is { isOk(): boolean } {
  if (
    typeof value !== "object" ||
    value === null ||
    !("isOk" in value) ||
    typeof value.isOk !== "function"
  ) {
    return false;
  }

  try {
    const ok = value.isOk();
    return ok === true || ok === false;
  } catch {
    return false;
  }
}

/**
 * Returns a function that styles a `string` with the given ANSI codes.
 */
export function styler(
  style: Iterable<number> | number,
  ...styles: Array<number>
): (content: string) => string {
  return (content) => ansi(content, style, ...styles);
}

/**
 * Prompts the user and promises to return a response from standard input.
 *
 * Results in an `Error` when EOT is read.
 */
export async function get_line(
  prompt: string,
  or: string,
): Promise<Result<string, Nil>> {
  console.log(prompt);

  const { createInterface } = await import("node:readline");
  const { default: { stdin, stderr } } = await import("node:process");

  try {
    prompt = "> ";
    const ui = createInterface({
      input: stdin,
      output: stderr,
      prompt,
    });

    return await new Promise((resolve) => {
      const quit = () => {
        console.error();
        resolve(Result$Error(Nil));
      };

      ui.once("close", quit);
      ui.once("SIGINT", () => ui.close());
      ui.once("line", (answer) => {
        if (!answer) {
          answer = or;
          stderr.write("\u{1b}[1A" + prompt + answer + "\n");
        }

        ui.off("close", quit);
        ui.close();

        resolve(Result$Ok(answer));
      });

      ui.prompt();
    });
  } catch {
    return Result$Error(Nil);
  }
}

/**
 * Returns the path of the current working directory.
 */
export function current_directory(): string {
  return (process ? process : Deno).cwd();
}

/**
 * Changes the current working directory.
 */
export function change_directory(path: string): Result<Nil, string> {
  try {
    return Result$Ok((process ? process : Deno).chdir(path));
  } catch (error) {
    return Result$Error(String(error instanceof Error ? error.message : error));
  }
}

/**
 * Determines whether the given path exists and is readable.
 */
export function file_is_readable(path: string): boolean {
  try {
    if (fs) {
      const fd = fs.openSync(path, "r");
      fs.close(fd);
    } else {
      const fs_file = Deno.openSync(path, { read: true });
      fs_file.close();
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Writes a file to the given path, creating directories as needed, unless the
 * file already exists.
 *
 * @internal
 */
export function file_write(
  pathname: string,
  content: string,
  mode: number,
  force: boolean,
): Result<boolean, Nil> {
  return try_create(() => {
    (fs ? fs : Deno).mkdirSync(
      path.dirname(pathname),
      {
        recursive: true,
        mode: 0o755,
      },
    );

    fs
      ? fs.writeFileSync(pathname, content, {
        flag: force ? "w" : "wx",
      })
      : Deno.writeTextFileSync(pathname, content, {
        create: true,
        createNew: !force,
      });

    (fs ? fs : Deno).chmodSync(pathname, mode);
  });
}

/**
 * Results in a `boolean` indicating whether a file or directory was created
 * (`true`) or already existed (`false`), or nothing on failure, when any other
 * type of error was thrown.
 *
 * @internal
 */
function try_create(f: () => void): Result<boolean, Nil> {
  try {
    f();
    return Result$Ok(true);
  } catch (error) {
    const existed = fs
      ? (error as NodeJS.ErrnoException).code === "EEXIST"
      : error instanceof Deno.errors.AlreadyExists;
    return existed ? Result$Ok(false) : Result$Error(Nil);
  }
}

/**
 * Determines whether the program started from a `gleam run` command.
 */
export function main_module_is_gleam(): boolean {
  return main_module().endsWith("/gleam.main.mjs");
}

/**
 * Returns the current entrypoint module entered from the command-line.
 */
function main_module(): string {
  return process ? (process.argv[1] ?? "") : Deno.mainModule;
}

/**
 * Determines whether the program is using the Bun runtime.
 */
export function runtime_is_bun(): boolean {
  return "Bun" in globalThis;
}

/**
 * Determines whether the program is using the Deno runtime.
 */
export function runtime_is_deno(): boolean {
  return "Deno" in globalThis;
}

/**
 * Returns the last segment of the given path, ignoring any trailing directory
 * separators.
 */
export function path_basename(pathname: string): string {
  return path.basename(pathname);
}

/**
 * Returns the directory path of the given path.
 */
export function path_dirname(pathname: string): string {
  return path.dirname(pathname);
}

/**
 * Determines whether the given path is absolute.
 */
export function path_is_absolute(pathname: string): boolean {
  return path.isAbsolute(pathname);
}

/**
 * Joins a `List` of paths into a new path and normalizes the result.
 */
export function path_join(paths: List<string>): string {
  return path.join(...paths);
}

/**
 * Normalizes the path, resolving `".."` and `"."` segments.
 *
 * A normalized path may still contain leading `".."` segments or the lone `"."`
 * segment.
 */
export function path_normalize(pathname: string): string {
  return path.normalize(pathname);
}

/**
 * Returns a relative path from the first to the second given path, based on
 * the current working directory.
 */
export function path_relative(from: string, to: string): string {
  return path.relative(from, to);
}
