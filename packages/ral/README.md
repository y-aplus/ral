# ral

`ral publish` publishes the current repository state to a branch in your public GitHub fork and returns a shareable URL. It deliberately does not open an upstream pull request.

## Development install

```sh
npm install --global ./packages/ral
ral publish --dry-run
```

Requirements:

- Node.js 20+
- Git
- GitHub CLI (`gh`) authenticated with `gh auth login`
- A public GitHub source repository

## Commands

```text
ral publish [--dry-run] [--yes] [--message <text>]
ral --help
ral --version
```

When the worktree is dirty, `ral` shows every changed path before asking whether to create a commit. `--yes` accepts prompts and must only be used after reviewing the repository. Common secret-bearing filenames are blocked whether they are already tracked or only present in the working tree.
