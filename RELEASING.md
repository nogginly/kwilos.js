# Releasing Kwilos

Versions are published to npm by the [Publish workflow](.github/workflows/publish.yml) when a version tag is pushed. It runs the full CI checks, confirms the tag matches the version in `package.json`, and publishes with [npm trusted publishing](https://docs.npmjs.com/trusted-publishers), so no npm token is stored anywhere. A version already on npm is skipped.

## Each release

1. On a branch such as `release/v0.8.0`:
   - bump the version with `npm version 0.8.0 --no-git-tag-version`, which updates `package.json` and `package-lock.json`
   - in `CHANGELOG.md`, turn the `Unreleased` section into `[0.8.0] - <date>`, leaving an empty `Unreleased` section above it
   - update the version in the README's CDN example
2. Merge the branch into `main` once CI passes.
3. Tag the merged commit and push the tag:

   ```sh
   git fetch origin
   git tag -a v0.8.0 origin/main -m "Kwilos JS 0.8.0"
   git push origin v0.8.0
   ```

4. Watch the Publish workflow in the repository's Actions tab. When it finishes, the version appears on [npmjs.com](https://www.npmjs.com/package/kwilos.js), and on the CDNs within minutes.

To see what a release would contain without publishing it, run `npm pack --dry-run`.

## The first release only

A trusted publisher is configured on an existing package, so the first version is published by hand:

1. Merge the release branch, and check out the merged commit with a clean install:

   ```sh
   git checkout main && git pull
   npm ci
   ```

2. Log in to npm, with two-factor authentication on the account, and publish. `prepack` builds `_dist` first.

   ```sh
   npm login
   npm publish --access public
   ```

3. On npmjs.com, open the package's settings, and under **Trusted publishing** add a GitHub Actions publisher:
   - organization or user: `nogginly`
   - repository: `kwilos.js`
   - workflow filename: `publish.yml`

4. Push the version tag as in step 3 above. The workflow runs the checks and skips publishing, since the version is already on npm.

From then on, releases follow "Each release". Optionally, once a release has published through the workflow, set the package on npmjs.com to require two-factor authentication and disallow tokens, so that only the workflow can publish.
