# Releasing Kwilos

Releases are published in two stages:

1. The [Publish workflow](.github/workflows/publish.yml) runs when a version tag is pushed. It runs the full CI checks, confirms the tag matches the version in `package.json`, and [stages](https://docs.npmjs.com/cli/commands/npm-stage) the package on npm with [trusted publishing](https://docs.npmjs.com/trusted-publishers), so no npm token is stored anywhere. A version already on npm is skipped.
2. A maintainer approves the staged version on npmjs.com, with two-factor authentication, which publishes it. The workflow cannot publish on its own, so a compromised workflow run or dependency cannot release a version nobody has checked.

The [Pages workflow](.github/workflows/pages.yml) then builds the [web site](https://nogginly.github.io/kwilos.js/) from that release and deploys it to GitHub Pages. The Publish workflow runs it after staging the release, and its deploy then waits for your approval in GitHub. The site carries its own copy of Kwilos for its samples, but its Get started section shows the CDN address for the released version, so approve the deploy only after the version itself; if the version is not yet on npm, the deploy stops without changing the site.

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

4. Watch the Publish workflow in the repository's Actions tab. When it finishes, the version is staged on npm but not yet public.
5. Approve it, either on [npmjs.com](https://www.npmjs.com/package/kwilos.js) or from a terminal logged in to npm:

   ```sh
   npm stage list kwilos.js
   npm stage approve <stage-id>
   ```

   The version then appears on npm and the CDNs. `npm stage download <stage-id>` fetches the staged tarball, to inspect it first; `npm stage reject <stage-id>` discards it.
6. Approve the web site's deployment: open the Publish run in the Actions tab, choose **Review deployments**, tick **github-pages** and approve. The deploy stops with an error if the version is not on npm yet, as when it is approved first; re-run that job once it is.

A staged version holds its version number, so a re-run of the Publish workflow fails while it waits for approval. Approve or reject the staged version first.

To redeploy the web site without a release, for example after fixing a typo in the docs, run the Pages workflow by hand from the Actions tab: choose **Run workflow**, and select the latest version tag, or `main` when it has no changes since that release. The deploy waits for approval, as for a release. The site describes the branch or tag it is built from, so building from `main` with unreleased changes would document features the released version does not have yet.

To preview the site locally, run `npm run build-site` and serve the repository root with any static web server, for example `python3 -m http.server`, then open `_site/`.

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
   - leave **Allow `npm publish`** and **Allow `npm dist-tag`** unchecked; `npm stage publish` is always allowed, and is all the workflow uses

4. Push the version tag as in step 3 above. The workflow runs the checks and skips publishing, since the version is already on npm.

From then on, releases follow "Each release". Optionally, set the package on npmjs.com to require two-factor authentication and disallow tokens, so that every version, staged or not, needs a maintainer's two-factor approval.

## Setting up the web site, once

1. In the repository's **Settings → Pages**, set **Source** to **GitHub Actions**.
2. In **Settings → Environments → github-pages**, under **Deployment branches and tags**, add a rule for tags matching `v*`. GitHub creates this environment allowing deployments from `main` only, so without the rule a release tag cannot deploy the site.
3. In the same environment, tick **Required reviewers** and add yourself, so deployments wait for approval. Pending approvals expire after 30 days.
4. Run the Pages workflow by hand from `main`, as described above, to publish the site for the current release.
