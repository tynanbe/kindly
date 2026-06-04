import path from "node:path";
import { pathToFileURL } from "node:url";
import type { List, Result as Result$ } from "../prelude.d.mts";
// TODO: toList
import {
  Result$Error,
  Result$Error$0,
  Result$isError,
  Result$Ok,
  toList,
} from "../prelude.mjs";
// TODO: review
import type { None, Some } from "../gleam_stdlib/gleam/option.d.mts";
import { unwrap as option_unwrap } from "../gleam_stdlib/gleam/option.mjs";
import generated from "./generated.ts";
import toml_runtime from "./vendor/smol_toml/dist/index.js";

type TomlTable = { [key: string]: TomlValue };
type TomlValue =
  | string
  | number
  | bigint
  | boolean
  | Array<TomlValue>
  | TomlTable;

const toml = toml_runtime as unknown as {
  parse(input: string): TomlTable;
  stringify(input: TomlTable): string;
};

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
      fs: await import("node:fs/promises"),
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

const handbook_runner_dir = path.join("build", "kindly", "handbook_runner");
const handbook_runner_package = "kindly_handbook_runner";

const gleam_handbook: [string, string] = [
  path.join("dev", "handbook.gleam"),
  path.join(
    handbook_runner_dir,
    "build",
    "dev",
    "javascript",
    handbook_runner_package,
    "handbook.mjs",
  ),
];
const handbook_modules: Array<[string, string | Nil]> = [
  gleam_handbook,
  ["handbook.ts", Nil],
  ["handbook.mjs", Nil],
  ["handbook.js", Nil],
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
  min_gleam_version: string;
  project_root: string;
  should_style: string;
  stdin: string;
  version: string;
};

const kindly_global = globalThis as { Kindly?: Kindly };

let Kindly = kindly_global.Kindly;

if (!Kindly) {
  const decoder = new TextDecoder("utf-8");

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
    min_gleam_version: decoder.decode(generated.min_gleam_version),
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
      // Await in loop keeps handbook detection deterministic
      // deno-lint-ignore no-await-in-loop
      if (await file_is_readable(path.join(dir, handbook))) {
        // deno-lint-ignore no-await-in-loop
        await set_gleam_project(dir);
        Kindly.project_root = dir;
        Kindly.handbook_module = path.join(dir, compiled ?? handbook);
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
      const has_indicator = (
        // Project root search is ordered
        // deno-lint-ignore no-await-in-loop
        await Promise.all(
          project_root_indicators.map((x) =>
            file_is_readable(path.join(dir, x))
          ),
        )
      ).some(Boolean);
      if (has_indicator) {
        const { project_root } = Kindly;
        Kindly.project_root = dir;
        if (project_root !== current_directory()) {
          break search;
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
 * Promises to set global state for `gleam_project` after trying to read a
 * project name from `gleam.toml`.
 *
 * @internal
 */
export async function set_gleam_project(dir: string): Promise<Nil> {
  const gleam_config = path.join(dir, "gleam.toml");

  const content = await file_read(gleam_config, "utf-8") ?? "";

  const re = new RegExp(
    ["(?:^|\n)", "name", "=", `["'](.*?)["']`, "(?:\n|$)"]
      .join("(?: |\t)*"),
  );

  Kindly!.gleam_project = re.exec(content)?.[1] ?? "";
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
export async function get_handbook(): Promise<
  Result<() => Promise<never>, string>
> {
  const build_result = await maybe_build_gleam_handbook();

  if (Result$isError(build_result)) {
    return Result$Error(
      Result$Error$0(build_result) ?? "can’t build `handbook.gleam`",
    );
  }

  if (!Kindly!.handbook_module) {
    return Result$Error("no handbook to run");
  }

  try {
    const mod = await import(
      pathToFileURL(Kindly!.handbook_module).href
    ) as unknown;
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
      return Result$Ok(handbook.run as () => Promise<never>);
    }

    return Result$Error("can’t run handbook");
  } catch (error) {
    return Result$Error(
      error instanceof Error ? error.message : "can’t run handbook",
    );
  }
}

/**
 * Compiles a project's `dev/handbook.gleam` with an isolated Gleam runner.
 */
async function maybe_build_gleam_handbook(): Promise<Result<Nil, string>> {
  if (!Kindly!.handbook_module.endsWith(gleam_handbook[1])) {
    return Result$Ok(Nil);
  }

  const gleam_version_result = await check_gleam_version();

  if (Result$isError(gleam_version_result)) {
    return gleam_version_result;
  }

  if (!main_module_is_gleam()) {
    const root_build_output = await do_command("gleam", [
      "build",
      "--no-print-progress",
    ], { cwd: Kindly!.project_root });

    if (!root_build_output) {
      return Result$Error("can’t build `handbook.gleam`");
    }
  }

  const handbook_files = await gleam_handbook_files();

  try {
    const root_config = new TextDecoder("utf-8").decode(
      handbook_files.find(([pathname]) => pathname === "gleam.toml")?.[1] ??
        new Uint8Array(),
    );

    await file_write(
      path.join(handbook_runner_dir, "gleam.toml"),
      handbook_runner_config(root_config),
      0o644,
      true,
    );
    await file_write(
      path.join(
        handbook_runner_dir,
        "src",
        handbook_runner_package + ".gleam",
      ),
      "pub fn main() { Nil }\n",
      0o644,
      true,
    );
    await ensure_handbook_runner_dev(handbook_files);
  } catch (error) {
    return Result$Error(
      error instanceof Error ? error.message : "can’t build `handbook.gleam`",
    );
  }

  // Remove stale runner lock before compiling regenerated runner config
  const remove_manifest = await file_remove(
    path.join(handbook_runner_dir, "manifest.toml"),
  );

  if (Result$isError(remove_manifest)) {
    return Result$Error(
      "can’t build `handbook.gleam`\n" + Result$Error$0(remove_manifest),
    );
  }

  const compiler_output = await do_command("gleam", [
    "build",
    "--target=javascript",
    "--no-print-progress",
  ], { cwd: handbook_runner_dir });

  if (!compiler_output) {
    return Result$Error("can’t build `handbook.gleam`");
  }

  return Result$Ok(Nil);
}

/**
 * Parses `gleam --version` output to determine whether it meets Kindly's
 * minimum Gleam version requirement.
 */
async function check_gleam_version(): Promise<Result<Nil, string>> {
  const min_version = Kindly!.min_gleam_version.split(".").map(Number);

  if (min_version.length !== 3) {
    return Result$Error("Kindly has an unsupported Gleam version requirement");
  }

  const gleam_version = await do_command("gleam", ["--version"], {
    stdout: "piped",
  });

  if (!gleam_version?.success) {
    return Result$Error("can’t find `gleam` on `PATH`");
  }

  const found_version = gleam_version.stdout.match(
    /\bgleam +v?(\d+)[.](\d+)[.](\d+)\b/,
  );

  if (!found_version) {
    return Result$Error("can’t determine `gleam` version");
  }

  const parsed_version = [
    Number(found_version[1]),
    Number(found_version[2]),
    Number(found_version[3]),
  ];

  for (const i of [0, 1, 2]) {
    if (parsed_version[i]! > min_version[i]!) {
      return Result$Ok(Nil);
    }
    if (parsed_version[i]! < min_version[i]!) {
      return Result$Error(
        `Kindly requires Gleam >= ${Kindly!.min_gleam_version}, but ` +
          `\`gleam --version\` is ${parsed_version.join(".")}.`,
      );
    }
  }

  return Result$Ok(Nil);
}

/**
 * Promises to return a sorted `Array` of tuples with file paths and their
 * contents needed by the handbook runner.
 */
export async function gleam_handbook_files(): Promise<
  Array<[string, Uint8Array<ArrayBuffer>]>
> {
  const files = [
    "gleam.toml",
    "manifest.toml",
  ];

  for await (const x of find_all_files(path.dirname(gleam_handbook[0]))) {
    files.push(x);
  }

  files.sort();

  return (await Promise.allSettled(
    files.map(async (
      x,
    ): Promise<[string, Uint8Array<ArrayBuffer> | Nil]> => [
      x,
      await file_read(x),
    ]),
  )).reduce<Array<[string, Uint8Array<ArrayBuffer>]>>((acc, x) => {
    if ("value" in x && x.value[1]) {
      acc.push(x.value as [string, Uint8Array<ArrayBuffer>]);
    }
    return acc;
  }, []);
}

/**
 * Returns a Gleam config for the isolated handbook runner.
 */
function handbook_runner_config(root_config: string): string {
  const table = toml.parse(root_config);

  const dependencies = rewrite_dependencies(
    toml_table_field(table, "dependencies") ?? {},
  );
  const dev_dependencies = rewrite_dependencies(
    toml_table_field(table, "dev_dependencies") ??
      toml_table_field(table, "dev-dependencies") ?? {},
  );

  dependencies[Kindly!.gleam_project] = { path: "../../.." };

  return toml.stringify({
    name: handbook_runner_package,
    version: "0.0.0",
    target: "javascript",
    dependencies,
    dev_dependencies,
  });
}

/**
 * Returns a new `TomlTable` with resolved dependencies rewritten to the host
 * build package cache prepared by the project root `gleam build` preflight.
 */
function rewrite_dependencies(table: TomlTable): TomlTable {
  const dependencies = structuredClone(table);

  for (const [name, dependency] of Object.entries(dependencies)) {
    const runner_dependency = !is_toml_table(dependency) ||
        typeof dependency["version"] === "string" ||
        (typeof dependency["git"] === "string" &&
          typeof dependency["ref"] === "string")
      ? { path: path.join("build", "packages", name) }
      : dependency;

    if (typeof runner_dependency["path"] === "string") {
      const absolute_dependency_path = path.resolve(
        Kindly!.project_root,
        runner_dependency["path"],
      );

      const runner_path = path.join(
        Kindly!.project_root,
        handbook_runner_dir,
      );

      const relative_dependency_path = path.relative(
        runner_path,
        absolute_dependency_path,
      );

      runner_dependency["path"] = path_normalize(relative_dependency_path);

      dependencies[name] = runner_dependency;
    }
  }

  return dependencies;
}

/**
 * Determines whether the given `TomlValue` is a `TomlTable`.
 */
function is_toml_table(x: TomlValue): x is TomlTable {
  return typeof x === "object" && !Array.isArray(x) && !(x instanceof Date);
}

/**
 * Returns a `TomlTable` field from within the given `TomlTable`, if possible.
 */
function toml_table_field(table: TomlTable, key: string): TomlTable | Nil {
  const value = table[key];
  return value && is_toml_table(value) ? value : Nil;
}

/**
 * Makes the root project's `dev` modules visible to the handbook runner.
 */
async function ensure_handbook_runner_dev(
  handbook_files: Array<[string, Uint8Array<ArrayBuffer>]>,
): Promise<void> {
  const dev_source = path.join("..", "..", "..", "dev");
  const dev_destination = path.join(handbook_runner_dir, "dev");

  try {
    if (
      (await (fs ? fs.readlink : Deno.readLink)(dev_destination)) === dev_source
    ) {
      return;
    }
  } catch { /* Missing or not a readable symlink. */ }

  try {
    if (fs) {
      await fs.symlink(dev_source, dev_destination, "dir");
    } else {
      await Deno.symlink(dev_source, dev_destination, { type: "dir" });
    }
    return;
  } catch { /* Fall back to copying handbook files below. */ }

  const dev_dir = path.dirname(gleam_handbook[0]);
  const dev_prefix = dev_dir + path.sep;
  await Promise.all(
    handbook_files.map(([pathname, content]) => {
      if (pathname === dev_dir || pathname.startsWith(dev_prefix)) {
        return file_write(
          path.join(handbook_runner_dir, pathname),
          content,
          0o644,
          true,
        );
      }
      return Promise.resolve(Result$Ok(false));
    }),
  );
}

/**
 * Returns a script for adding Kindly command completion to the given shell.
 *
 * @internal
 */
export function completion_script(
  shell: keyof typeof generated["completion"],
): Result<string, Nil> {
  const script = new TextDecoder("utf-8").decode(generated.completion[shell]);
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

  const output = await do_command(bin, args);

  return output?.success ? Result$Ok(Nil) : Result$Error(Nil);
}

async function do_command(
  bin: string,
  args: Array<string>,
  options: {
    cwd?: string;
    stdin?: "inherit" | "null";
    stdout?: "inherit" | "piped";
    stderr?: "inherit" | "piped";
  } = {},
): Promise<
  | {
    code: number;
    stderr: string;
    stdout: string;
    success: boolean;
  }
  | Nil
> {
  options.cwd ??= ".";
  options.stdin ??= "inherit";
  options.stdout ??= "inherit";
  options.stderr ??= "inherit";

  const { cwd, stdin, stdout, stderr } = options;

  const output = {
    code: 1,
    stderr: "",
    stdout: "",
    success: false,
  };
  const decoder = new TextDecoder("utf-8");

  // Pass Ctrl+C to spawned process
  const pass_on = () => Nil;
  if (events && process) {
    process.on("SIGINT", pass_on);
  } else {
    Deno.addSignalListener("SIGINT", pass_on);
  }

  // Run the command
  try {
    if (spawn) {
      return await new Promise((resolve) => {
        const child_process = spawn(bin, args, {
          cwd,
          env: process!.env,
          stdio: [
            stdin === "null" ? "ignore" : stdin,
            stdout === "piped" ? "pipe" : stdout,
            stderr === "piped" ? "pipe" : stderr,
          ],
          windowsHide: true,
        });

        child_process.stderr?.on("data", (data) => {
          output.stderr += decoder.decode(data);
        });
        child_process.stdout?.on("data", (data) => {
          output.stdout += decoder.decode(data);
        });
        child_process.on("close", (code) => {
          output.code = code ?? 1;
          output.success = !output.code;

          resolve(code !== null ? output : Nil);
        });
      });
    }

    const command_output = await new Deno.Command(bin, {
      args,
      cwd,
      env: Deno.env.toObject(),
      stdin,
      stdout,
      stderr,
    }).output();

    output.code = command_output.code;
    if (stderr === "piped") {
      output.stderr = decoder.decode(command_output.stderr);
    }
    if (stdout === "piped") {
      output.stdout = decoder.decode(command_output.stdout);
    }
    output.success = command_output.success;

    return output;
  } catch {
    return Nil;
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
  if (process) {
    process.exit(code);
  } else {
    Deno.exit(code);
  }
  throw new Error("unreachable");
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
 * An async `Generator` that recursively returns all filepaths in a given
 * `directory`.
 *
 * Doesn't follow symlinks.
 */
async function* find_all_files(
  directory: string,
): AsyncGenerator<string> {
  const files = await (
    fs
      ? fs.readdir(directory, { withFileTypes: true })
      : Deno.readDir(directory)
  );

  for await (const file of files) {
    const pathname = path.join(directory, file.name);

    if (
      typeof file.isDirectory === "boolean"
        ? file.isDirectory
        : file.isDirectory()
    ) {
      yield* find_all_files(pathname);
    } else {
      yield pathname;
    }
  }
}

/**
 * Promises to determine whether the given path exists and is readable.
 */
export async function file_is_readable(path: string): Promise<boolean> {
  try {
    (await (
      fs ? fs.open(path, "r") : Deno.open(path, { read: true })
    ))
      .close();
    return true;
  } catch {
    return false;
  }
}

/**
 * Promises to try reading the entire contents of a file as an array of bytes, or optionally decoded as a `string`.
 */
async function file_read(
  path: string,
): Promise<Uint8Array<ArrayBuffer> | Nil>;
async function file_read<a>(
  path: string,
  encoding: string,
): Promise<string | Nil>;
async function file_read(
  path: string,
  encoding?: string,
): Promise<Uint8Array<ArrayBuffer> | string | Nil> {
  try {
    const content = await (fs ? fs.readFile(path) : Deno.readFile(path));
    const bytes = new Uint8Array(content);
    return encoding !== Nil ? new TextDecoder(encoding).decode(bytes) : bytes;
  } catch {
    return Nil;
  }
}

/**
 * Promises to try removing the given path, succeeding if it doesn't exist.
 */
async function file_remove(path: string): Promise<Result<Nil, string>> {
  try {
    await (fs ? fs.rm(path) : Deno.remove(path));
  } catch (error) {
    const is_missing = fs
      ? error instanceof Error && "code" in error && error.code ===
          "ENOENT"
      : error instanceof Deno.errors.NotFound;

    if (!is_missing) {
      return Result$Error(String(error));
    }
  }
  return Result$Ok(Nil);
}

/**
 * Promises to try writing a file to the given `path`, setting `content` and
 * octal `mode`, creating directories as needed, and optionally overwriting a
 * pre-existing file,
 *
 * @internal
 */
export function file_write(
  pathname: string,
  content: Uint8Array<ArrayBuffer> | string,
  mode: number,
  force: boolean,
): Promise<Result<boolean, Nil>> {
  return try_create(async () => {
    await (fs ? fs : Deno).mkdir(
      path.dirname(pathname),
      {
        recursive: true,
        mode: 0o755,
      },
    );

    await (fs
      ? fs.writeFile(pathname, content, {
        flag: force ? "w" : "wx",
      })
      : Deno.writeTextFile(
        pathname,
        typeof content === "string"
          ? content
          : new TextDecoder("utf-8").decode(content),
        {
          create: true,
          createNew: !force,
        },
      ));

    await (fs ? fs : Deno).chmod(pathname, mode);
  });
}

/**
 * Promises to result in a `boolean` indicating whether a file or directory was
 * created (`true`) or already existed (`false`), or nothing on failure, when
 * any other type of error was thrown.
 *
 * @internal
 */
async function try_create(
  f: () => Promise<void>,
): Promise<Result<boolean, Nil>> {
  try {
    await f();
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
