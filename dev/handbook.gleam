import gleam/io
import gleam/list
import kindly.{type Handbook, Stdout, command_step, group, task}

const gleam = ["gleam"]

const markdown = ["markdown", "md"]

const typescript = ["typescript", "ts"]

const typescript_files = [
  "mod.ts", "src/generated.ts", "src/javascript_api.ts", "src/kindly_ffi.ts",
  "src/set_ffi.ts",
]

pub fn main() -> Handbook {
  kindly.handbook(for: "kindly")
  |> group(
    doc: "Format source code",
    tags: ["format"],
    // gleam-format-wangle
    apply: fn(handbook) {
      let doc = fn(x) { "Format " <> x <> " source code" }
      handbook
      |> task(
        doc("Gleam"),
        tags: gleam,
        action: kindly.just(run: "gleam", with: ["format"]),
      )
      |> task(
        doc("Markdown, TypeScript"),
        tags: [markdown, typescript] |> list.flatten,
        action: kindly.just(run: "deno", with: ["fmt"]),
      )
    },
  )
  |> group(
    doc: "Check source code formatting",
    tags: ["format-check", "check", "ci"],
    apply: fn(handbook) {
      let doc = fn(x) { "Check " <> x <> " source code formatting" }
      handbook
      |> task(
        doc("Gleam"),
        tags: gleam,
        action: kindly.just(run: "gleam", with: ["format", "--check"]),
      )
      |> task(
        doc("Markdown, TypeScript"),
        tags: [markdown, typescript] |> list.flatten,
        action: kindly.just(run: "deno", with: ["fmt", "--check"]),
      )
    },
  )
  |> group(
    doc: "Type check the project",
    tags: ["type-check", "check", "ci"],
    apply: fn(handbook) {
      let doc = fn(x) { "Type check " <> x <> " code" }
      handbook
      |> task(
        doc("Gleam"),
        tags: gleam,
        action: kindly.just(run: "gleam", with: ["check"]),
      )
      |> task(
        doc("TypeScript"),
        tags: typescript,
        action: kindly.just(run: "deno", with: ["check", ..typescript_files]),
      )
    },
  )
  |> task(
    doc: "Lint the project",
    tags: ["lint", "ci", ..typescript],
    action: kindly.just(run: "deno", with: ["lint"]),
  )
  |> group(
    doc: "Run the project tests",
    tags: ["test", "ci"],
    apply: fn(handbook) {
      let test_subhandbook = fn(command) {
        fn(_) {
          let margin = "  │ " |> kindly.ansi(apply: [bold, bright_black])
          case Stdout |> kindly.is_terminal {
            True -> "COLOUR" |> kindly.set_env(value: "always")
            False -> Nil
          }
          kindly.command(run: "sh", with: ["-uc", "
            output=$(" <> command <> " 2>&1)
            status=${?}
            printf '%b\n' \"${output}\" \\
              | awk '{ print \"" <> margin <> "\" $0 }'
            exit ${status}
          "])
        }
      }
      handbook
      |> task(
        doc: "Run Gleam tests with Bun",
        tags: [gleam, ["bun"]] |> list.flatten,
        action: kindly.just(run: "gleam", with: ["test", "--runtime=bun"]),
      )
      |> task(
        doc: "Run Gleam tests with Deno",
        tags: [gleam, ["deno"]] |> list.flatten,
        action: kindly.just(run: "gleam", with: ["test", "--runtime=deno"]),
      )
      |> task(
        doc: "Run Gleam tests with Node.js",
        tags: [gleam, ["node"]] |> list.flatten,
        action: kindly.just(run: "gleam", with: ["test", "--runtime=node"]),
      )
      |> task(
        doc: "Test a Deno project",
        tags: ["deno", ..typescript],
        action: test_subhandbook(
          "cd test_projects/deno_project/
          {
            deno run --allow-all \\
              ../../mod.ts --help
              # handbook.ts --help
            echo
            deno run --allow-all \\
              ../../mod.ts --any ci print --time -- abc 123
              # handbook.ts --any ci print --time -- abc 123
          }",
        ),
      )
      |> task(
        doc: "Test a Node.js project",
        tags: ["node", "javascript", "js"],
        action: test_subhandbook(
          "cd test_projects/node_project/
          {
            # node handbook.js --help
            node_modules/.bin/kindly --help
            echo
            # node handbook.js --any ci print --time -- abc 123
            node_modules/.bin/kindly --any ci print --time -- abc 123
          }",
        ),
      )
    },
  )
  |> task(
    doc: "Automate project tasks",
    tags: ["watch"],
    // gleam-format-wangle
    action: fn(args) {
      let args = case args {
        [] -> {
          let success = "CI Passed" |> kindly.ansi(apply: [bold, green])
          let failure = "CI Failed" |> kindly.ansi(apply: [bold, red])
          ["sh", "-euc", "echo
          if gleam run --module=handbook -- ci --time; then
            printf '\n%b\n' '" <> success <> "'
          else
            printf '\n%b\n' '" <> failure <> "'
          fi"]
        }
        _else -> args
      }
      kindly.command(run: "watchexec", with: [
        "--ignore=.git",
        "--ignore=build",
        "--no-shell",
        "--postpone",
        "--watch-when-idle",
        "--",
        ..args
      ])
    },
  )
  |> task(
    doc: "Bundle the project for Bun, Deno, Node.js",
    tags: ["bundle"],
    action: fn(args) {
      let build_dir = "build/dev/javascript/kindly/"
      let out_dir = "priv/dist/"

      let lib = build_dir <> "kindly.mjs"

      let entry = "mod.ts"
      let never_bundle = out_dir <> "kindly.js"

      let cli_entry = out_dir <> "cli.js"

      let tsdown = "node_modules/.bin/tsdown"
      let args = [
        "--format=esm",
        "--no-fixedExtension",
        "--platform=node",
        "--treeshake",
        "--tsconfig=tsconfig.bundle.json",
        "--out-dir=" <> out_dir,
        ..args
      ]

      to("Write `src/generated.ts` module")
      use <- command_step(run: "sh", with: [
        "-euc",
        "bun run - <<'EOF'
        const { file, TOML, write } = Bun;
        const config = TOML.parse(await file('gleam.toml').text());
        const encoder = new TextEncoder();
        const kindly =
          (key) => `${key}: new Uint8Array([${
            encoder.encode(config[key])
          }]) as Uint8Array`;
        const completion =
          async (shell, ext) => `${shell}: new Uint8Array([${
            await file(`priv/completion/kindly.${ext ?? shell}`).bytes()
          }]) as Uint8Array`;
        write(
          'src/generated.ts',
          `// This module is generated by \\`kindly bundle\\`

          // Exports marked @internal aren’t public API and may change anytime

          // deno-fmt-ignore-file

          // @internal
          export default {
            ${kindly('version')},

            ${kindly('description')},

            completion: {
              ${await completion('bash')},

              ${await completion('fish')},

              ${await completion('pwsh', 'ps1')},

              ${await completion('zsh')},
            },
          };
          `
            .replace(/^          /gm, ''),
        );\nEOF
      ",
      ])

      to("Build the project")
      use <- command_step(run: "gleam", with: ["build"])

      to("Provide Gleam prelude and type declarations")
      use <- command_step(run: "cp", with: [
        build_dir <> "../prelude.d.mts",
        build_dir <> "../prelude.mjs",
        "./",
      ])
      use <- command_step(run: "sed", with: [
        "-Ei",
        "1s#^#// @ts-self-types=\"./prelude.d.mts\"\\\n#",
        "prelude.mjs",
      ])

      to("Provide Gleam `Option` and type declarations")
      let stdlib = "gleam_stdlib/gleam/"
      use <- command_step(run: "mkdir", with: ["-p", stdlib])
      use <- command_step(run: "cp", with: [
        build_dir <> "../" <> stdlib <> "option.d.mts",
        build_dir <> "../" <> stdlib <> "option.mjs",
        stdlib,
      ])
      use <- command_step(run: "sed", with: [
        "-Ei",
        "s#([.][.]/)gleam([.]d[.]mts)#\\1\\1prelude\\2#g",
        stdlib <> "option.d.mts",
      ])
      use <- command_step(run: "sed", with: [
        "-Ei",
        "s#([.][.]/)gleam([.]mjs)#\\1\\1prelude\\2#g",
        stdlib <> "option.mjs",
      ])

      to("Ensure `tsdown` exists")
      use <- command_step(run: "sh", with: ["-euc", "
        if ! type " <> tsdown <> " >/dev/null 2>&1; then
          echo 'Installing `tsdown`'
          npm ci --loglevel=error --no-fund --no-update-notifier
        fi
      "])

      to("Provide `Deno` type declaration")
      use <- command_step(run: "sh", with: ["-euc", "
        deno types >" <> build_dir <> "deno.d.ts
      "])

      to("Compile lib")
      use <- command_step(run: tsdown, with: [
        lib,
        "--clean",
        "--minify",
        ..args
      ])

      to("Compile entry")
      use <- command_step(run: tsdown, with: [
        entry,
        "--dts",
        // "--no-splitting",
        "--no-clean",
        "--deps.neverBundle=./" <> never_bundle,
        "--deps.neverBundle=../" <> never_bundle,
        ..args
      ])

      to("Fix imports in entry")
      use <- command_step(run: "sed", with: [
        "-Ei",
        "s#([.]([.]/))?" <> out_dir <> "#\\2#g",
        out_dir <> "mod.js",
      ])

      to("Write cli entry")
      use <- command_step(run: "python", with: ["-c", "
        import functools as fn, os, textwrap
        opener = fn.partial(os.open, mode=0o755)
        with open('" <> cli_entry <> "', 'w', opener=opener) as file:
          file.write(textwrap.dedent('''\\
            #!/usr/bin/env node
            import { main } from './kindly.js';
            main();
          '''))
      "])

      kindly.resolve()
    },
  )
}

/// Prints a list item heading.
///
fn to(do: String) {
  { "• " <> do } |> kindly.ansi(apply: [bold, italic, green]) |> io.println
}

/// Common ANSI codes.
///
const bold = 1

const italic = 3

const green = 32

const red = 31

const bright_black = 90
