# Examples

Kindly handbooks can be written in Gleam, TypeScript, or JavaScript, and the
best examples currently live in this repository.

- `dev/handbook.gleam` shows Kindly's own real-world project handbook. It uses
  grouped tasks, shared helpers, generated task definitions, and multistep
  command chains.
- `demos/handbook.ts` is a more playful TypeScript example that still shows the
  shape of a larger handbook with groups and reusable task helpers.
- `test_projects/deno_project/handbook.ts` is a small Deno example.
- `test_projects/node_project/handbook.js` is a small Node.js example.

## What to look for

These examples show a few different styles of use:

- Direct tasks with one obvious tag
- Grouped tasks that can be narrowed by additional tags
- Shared helpers for repeated command patterns
- Task generation in code
- Multistep tasks using `step` and `command_step`

For a guided introduction, see the
[Quickstart guide](https://hexdocs.pm/kindly/quickstart.html). For the full API,
see the [API reference](https://hexdocs.pm/kindly/kindly.html).
