import kindly, { resolve, step } from "../../mod.ts";

export default kindly.handbook("deno_project")
  .theme({
    ...kindly.default_theme(),
    highlight: kindly.styler(1, 4, 97),
    tab: "    ",
  })
  .task({
    doc: "print anything",
    tags: ["echo", "print"],
    action: (args) => kindly.command("echo", args),
  })
  .task({
    doc: "print anything, then print done",
    tags: ["echo-steps", "print"],
    action: (args) =>
      step(kindly.just("echo", args))
        .command_step("echo", "done")
        .resolve(),
  })
  .group({
    doc: "print numbers",
    tags: ["echo-numbers", "print"],
    apply: (handbook) => {
      const echo = (str: string) => () => {
        console.log(str);
        return resolve();
      };
      return handbook
        .task("print one", ["one"], echo("one"))
        .task("print two", ["two"], echo("two"));
    },
  })
  .task_with_tasks({
    doc: "print the handbook tasks",
    tags: ["echo-self", "print"],
    action: (_, tasks) =>
      kindly.command(
        "printf",
        "tasks: [\n  %s\n]\n",
        tasks
          .map(({ doc, tags, group_doc }) =>
            `{doc:"${doc}", tags:${JSON.stringify([...tags])}${
              undefined === group_doc ? "" : `, group_doc:"${group_doc}"`
            }},`
          )
          .join("\n  "),
      ),
  })
  .map({
    apply: (handbook) => {
      const deno_fmt = (...args: Array<string>) =>
        kindly.just("deno", "fmt", ...args);
      return handbook
        .task("Format source code", ["format"], deno_fmt())
        .task(
          "Check source code formatting",
          ["format-check", "check", "ci"],
          deno_fmt("--check"),
        );
    },
  })
  .group("None", [], (handbook) => handbook)
  .map((handbook) => handbook)
  .task(
    "Type check the project",
    ["type-check", "check", "ci"],
    kindly.just("deno", "check", "handbook.ts"),
  )
  .task(
    "Lint the project",
    ["lint", "ci"],
    kindly.just("deno", "lint"),
  );
