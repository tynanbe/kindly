<div id="table-of-contents"></div>

<div id="toc"></div>

## Table of Contents

1. [About](#about)
1. [Installation](#installation)
1. [Completions](#completions)
1. [Run It](#run-it)
1. [Where Next?](#where-next)

<div id="about"></div>

## About

Kindly provides a simple yet flexible way to reference and run one or more
user-defined tasks specific to your project.

By creating a project Handbook with minimal boilerplate, you can write your
tasks in Gleam, TypeScript, or JavaScript for a better developer experience that
can also make it easier to ensure your tasks will work in any environment with
your runtime of choice (Node.js, Deno, or Bun).

Kindly bases task selection on a flat system of tags, although you could use it
to emulate a command tree typical of other CLI tools. This allows you to group
multiple tasks in a way that fits your project's needs and run all of them
together or filter selected tasks for those in the group.

For example, suppose your Handbook has tasks with the following tags:

```txt
A. test, erlang
B. test, javascript
C. format-check, gleam
D. format-check, erlang
E. format-check, javascript
```

Invoking Kindly with different arguments would run various tasks as follows
(_Note: You can always include the `--help` flag to show which tasks Kindly
plans to run given your other arguments_):

```sh
kindly test erlang # A
kindly test # A, B
kindly javascript # B, E
kindly format-check --any gleam erlang # C, D
```

The first tag for each task should be the most specific way to reference that
task. It's given special consideration in Kindly's help output.

<div id="installation"></div>

## Installation

It's recommended to install Kindly globally with Deno, Bun, or your Node.js
package manager of choice. This method is the simplest way to get shell
completions, and Kindly will still run your handbook using your project's local
Kindly dependency.

<details>
<summary><strong>Bun</strong></summary>

```sh
bun install --global @tynanbe/kindly
```

</details>

<details open>
<summary><strong>Deno</strong></summary>

```sh
deno install --global --allow-all jsr:@tynanbe/kindly
```

</details>

<details>
<summary><strong>Node.js</strong></summary>

```sh
# Or similar for pnpm, yarn, etc.
npm install --global @tynanbe/kindly
```

</details>

<div id="completions"></div>

## Completions

After you've installed Kindly globally or worked out some other way to get
`kindly` on your `$PATH`, you can set up shell completions and Kindly will
suggest the tags for your project as well as its own flags.

<details>
<summary><strong>Bash</strong></summary>

![Bash Completion Demo](https://github.com/tynanbe/kindly/raw/main/images/bash-completion.avif)

```sh
# ~/.bashrc
if type kindly >/dev/null 2>&1; then
  eval "$(kindly --cue bash)"
fi
```

</details>

<details open>
<summary><strong>Fish</strong></summary>

![Fish Completion Demo](https://github.com/tynanbe/kindly/raw/main/images/fish-completion.avif)

```sh
# ~/.config/fish/config.fish
if type kindly >/dev/null 2>&1
    kindly --cue fish | source
end
```

</details>

<details>
<summary><strong>PowerShell (pwsh)</strong></summary>

![Pwsh PowerShell Completion Demo](https://github.com/tynanbe/kindly/raw/main/images/pwsh-completion.avif)

```sh
# ~/.config/powershell/profile.ps1
# or $HOME\Documents\PowerShell\profile.ps1
if (Get-Command -Name kindly -ErrorAction Ignore) {
    kindly --cue pwsh | Out-String | Invoke-Expression
}

# -Function MenuComplete is recommended, but
# -Function Complete should also work
Set-PSReadlineKeyHandler -Key Tab -Function MenuComplete
```

</details>

<details>
<summary><strong>Zsh</strong></summary>

![Zsh Completion Demo](https://github.com/tynanbe/kindly/raw/main/images/zsh-completion.avif)

```sh
# ~/.zshrc
if type kindly >/dev/null 2>&1; then
  eval "$(kindly --cue zsh)"
fi
```

</details>

<div id="run-it"></div>

## Run It

```sh
# Print help info
kindly
# Run an example task
kindly format-check
```

> **Note:** If your project uses a `handbook.gleam` or `handbook.ts` module and
> you want to run it with Node.js, it's recommended to run Node.js v24.0+, for
> [type stripping](https://nodejs.org/api/typescript.html#type-stripping)
> support.

<div id="where-next"></div>

## Where Next?

[API Reference](https://hexdocs.pm/kindly/kindly.html)

[Examples](https://hexdocs.pm/kindly/examples.html)
