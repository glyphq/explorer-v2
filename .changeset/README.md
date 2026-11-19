# Changesets

This repository uses [Changesets](https://changesets.dev) to version the
workspace and publish GitHub releases. Nothing is published to npm: every
package is private, and `changeset publish` only creates git tags which the
release workflow turns into GitHub releases.

Add a changeset for every change that should appear in the changelog:

```bash
bun run changeset
```

Release flow:

1. Push changesets to `main`.
2. The release workflow opens or updates a "version packages" pull request.
3. Merging that pull request tags the packages and creates GitHub releases.
