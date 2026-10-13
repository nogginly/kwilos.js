# Releasing Kwilos

Versions are published to npm by the [Publish workflow](.github/workflows/publish.yml) when a version tag is pushed. It runs the full CI checks, confirms the tag matches the version in `package.json`, and publishes with [npm trusted publishing](https://docs.npmjs.com/trusted-publishers), so no npm token is stored anywhere. A version already on npm is skipped.

It then runs the [Pages workflow](.github/workflows/pages.yml), which builds the [web site](https://nogginly.github.io/kwilos.js/) from that release and deploys it to GitHub Pages. The site's samples load Kwilos from the CDN at the released version, so the site is deployed only once that version is on npm.

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

4. Watch the Publish workflow in the repository's Actions tab. When it finishes, the version appears on [npmjs.com](https://www.npmjs.com/package/kwilos.js) and the CDNs, and the web site is updated.

To redeploy the web site without a release, for example after fixing a typo in the docs, run the Pages workflow by hand from the Actions tab: choose **Run workflow**, and select the latest version tag, or `main` when it has no changes since that release. The site describes the branch or tag it is built from, so building from `main` with unreleased changes would document features the CDN does not have yet.

To preview the site locally, run `npm run build-site -- --from-src` and serve the repository root with any static web server, for example `python3 -m http.server`, then open `_site/`.

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

## Setting up the web site, once

1. In the repository's **Settings → Pages**, set **Source** to **GitHub Actions**.
2. In **Settings → Environments → github-pages**, under **Deployment branches and tags**, add a rule for tags matching `v*`. GitHub creates this environment allowing deployments from `main` only, so without the rule a release tag cannot deploy the site.
3. Run the Pages workflow by hand from `main`, as described above, to publish the site for the current release.
