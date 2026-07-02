# dependabot-grouping-test

A minimal dummy Node.js project that demonstrates and validates **Dependabot security-update grouping** behavior by running two phases: first without any grouping configuration, then with it.

---

## Intentionally Vulnerable Dependencies

### Production dependencies (`dependencies`)

| Package | Pinned version | Patched version | GitHub Advisory |
|---|---|---|---|
| `axios` | `0.21.1` | `0.21.2` | [GHSA-cph5-m8f7-6c5x](https://github.com/advisories/GHSA-cph5-m8f7-6c5x) — Server-Side Request Forgery |
| `minimist` | `1.2.5` | `1.2.6` | [GHSA-xvch-5gv4-984h](https://github.com/advisories/GHSA-xvch-5gv4-984h) — Prototype Pollution |
| `path-parse` | `1.0.6` | `1.0.7` | [GHSA-hj48-42vr-x3v9](https://github.com/advisories/GHSA-hj48-42vr-x3v9) — ReDoS |

### Dev dependencies (`devDependencies`)

| Package | Pinned version | Patched version | GitHub Advisory |
|---|---|---|---|
| `glob-parent` | `5.1.1` | `5.1.2` | [GHSA-ww39-953v-wcq6](https://github.com/advisories/GHSA-ww39-953v-wcq6) — ReDoS |
| `hosted-git-info` | `2.8.8` | `2.8.9` | [GHSA-43f8-2h32-f4cj](https://github.com/advisories/GHSA-43f8-2h32-f4cj) — ReDoS |
| `lodash` | `4.17.20` | `4.17.21` | [GHSA-p6mc-m468-83gw](https://github.com/advisories/GHSA-p6mc-m468-83gw) — Command Injection |
| `node-fetch` | `2.6.1` | `2.6.7` | [GHSA-w7rc-rwvf-8q5r](https://github.com/advisories/GHSA-w7rc-rwvf-8q5r) — Exposure of Sensitive Information |

---

## Two-Phase Test Plan

### Phase 1 — No grouping config (baseline)

**Goal:** confirm that without `.github/dependabot.yml`, Dependabot opens one individual PR per vulnerable package.

#### Step 1 — Push without `dependabot.yml`

```bash
git add package.json index.js README.md
git commit -m "chore: add vulnerable deps for Dependabot grouping test (phase 1)"
git push -u origin main
```

> `dependabot.yml` is intentionally **not committed** yet.

#### Step 2 — Enable Dependabot in repository settings

1. **Settings → Code security → Dependabot alerts** → Enable
2. **Settings → Code security → Dependabot security updates** → Enable

Dependabot will scan the manifest shortly after being enabled.

#### Step 3 — Observe Phase 1 PRs

Navigate to the **Pull requests** tab. Expect **7 individual PRs** — one per vulnerable package, no grouping:

```
PR 1  axios 0.21.1 → 0.21.2
PR 2  minimist 1.2.5 → 1.2.6
PR 3  path-parse 1.0.6 → 1.0.7
PR 4  glob-parent 5.1.1 → 5.1.2
PR 5  hosted-git-info 2.8.8 → 2.8.9
PR 6  lodash 4.17.20 → 4.17.21
PR 7  node-fetch 2.6.1 → 2.6.7
```

---

### Phase 2 — With grouping config

**Goal:** confirm that adding `.github/dependabot.yml` causes Dependabot to group devDependency security updates into one PR while keeping production dependency updates individual.

#### Step 1 — Close all Phase 1 PRs

Close (do **not** merge) all 7 PRs opened in Phase 1. Dependabot will not re-open a PR for a package that already has an open PR, so they must be closed first.

You can do this quickly from the command line if you have the [GitHub CLI](https://cli.github.com/) installed:

```bash
# List all open Dependabot PRs
gh pr list --author "app/dependabot" --state open

# Close them all in one shot
gh pr list --author "app/dependabot" --state open --json number --jq '.[].number' \
  | xargs -I{} gh pr close {} --comment "Closing for Phase 2 grouping test"
```

Or close them manually in the GitHub UI (each PR → **Close pull request**).

#### Step 2 — Commit `dependabot.yml` and push

```bash
git add .github/dependabot.yml
git commit -m "chore: add Dependabot grouping config (phase 2)"
git push
```

#### Step 3 — Trigger a new Dependabot run

Pushing the new commit causes Dependabot to re-evaluate the manifest automatically. If you want to force an immediate run you can make a dummy change:

```bash
# Add/remove a trailing newline in package.json, then push
git commit --allow-empty -m "chore: trigger Dependabot re-scan"
git push
```

Alternatively, check **Insights → Dependency graph → Dependabot** and click **Check for updates** (available for version-update schedules; security updates re-evaluate on every push).

#### Step 4 — Observe Phase 2 PRs

Expect **4 PRs** — one grouped PR for all devDependencies and one individual PR per production dependency:

```
PR 1  [grouped]    "Bump dev-security-updates group" → glob-parent, hosted-git-info, lodash, node-fetch
PR 2  [individual] axios 0.21.1 → 0.21.2
PR 3  [individual] minimist 1.2.5 → 1.2.6
PR 4  [individual] path-parse 1.0.6 → 1.0.7
```

---

## `dependabot.yml` explained

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 0   # disables regular version-update PRs only
    groups:
      dev-security-updates:
        applies-to: security-updates   # key flag: targets security PRs, not version PRs
        dependency-type: "development" # matches devDependencies only
```

- `open-pull-requests-limit: 0` — suppresses routine version-bump PRs; security update PRs are **not** affected by this limit.
- `applies-to: security-updates` — without this key, a group only applies to version-update PRs.
- Production dependencies have **no group** defined, so each gets its own security PR.

---

## Project structure

```
.
├── .github/
│   └── dependabot.yml   # Commit this only for Phase 2
├── index.js             # Minimal entrypoint referencing all production deps
├── package.json         # Pinned vulnerable dependency versions
└── README.md
```
