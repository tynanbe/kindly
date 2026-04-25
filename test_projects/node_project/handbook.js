import kindly, { resolve, step } from "@tynanbe/kindly";

export default kindly.handbook({ for: "node_project" })
  .theme(kindly.plain_theme())
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
      const echo = (str) => () => {
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
      const deno_fmt = (...args) => kindly.just("deno", "fmt", ...args);
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
    "Syntax check the project handbook",
    ["syntax-check", "check", "ci"],
    kindly.just("node", "--check", "handbook.js"),
  )
  .task(
    "Lint the project",
    ["lint", "ci"],
    kindly.just("deno", "lint"),
  );
