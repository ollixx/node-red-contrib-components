# Project Review

## Executive summary

This project already has a useful functional core and a good set of scenario-driven tests for the Node-RED runtime. The main risks are not missing ideas, but missing hardening around release safety, test reliability, and long-term maintainability.

The most important findings are:

- The automated test suite is currently effectively disabled because one spec uses `it.only`, and `npm test` currently reports only one executed test.
- The runtime code contains at least one clear functional bug in status evaluation and several places with inconsistent error handling, swallowed exceptions, and string-based throws.
- The editor code depends on globals declared in other HTML node files and uses console logging instead of user-facing validation feedback, which makes maintenance brittle.
- The current npm package includes internal CI, VS Code, test, and UI-test files that should not be published.
- The npm publish workflow is outdated and risky: it publishes directly on `master` pushes and uses a floating third-party action from `@master`.
- The current UI test is a Puppeteer smoke test with screenshots and very limited assertions; it proves that the editor opens, but not that the user workflows actually behave correctly.

The suggested issues below are written so they can be copied into GitHub issues with minimal editing.

---

## Issue 1: Restore the real automated test suite and remove order-dependent fixtures

### Suggested title
Restore full test execution and make runtime specs deterministic

### Area
Tests

### Priority
High

### Problem
The current test suite is not exercising the project as intended. `components/test/nested_local_global_spec.js` contains `it.only`, which causes `npm test` to run only that one case. In addition, several specs mutate shared flow fixtures in place, which makes results depend on execution order and creates hidden coupling between tests.

### Evidence

- `npm test` currently reports a single passing test.
- `components/test/nested_local_global_spec.js` contains a focused test.
- `components/test/multiple_out_ports_spec.js` mutates the shared `testFlow` structure across nested `describe` blocks.

### Why this matters
Right now the project can easily ship regressions while still appearing green in CI. That undermines every other test-related investment.

### Proposed change

- Remove all focused tests such as `it.only` and add a guard that fails CI if any `.only` remains.
- Refactor specs so each test builds its own fresh flow definition instead of mutating shared objects.
- Separate pure scenario setup from assertions to make failures easier to diagnose.
- Ensure `npm test` executes every spec under `components/test` on a clean install.

### Acceptance criteria

- `npm test` runs all runtime specs without relying on focused tests.
- No test mutates shared fixture objects across test cases.
- CI fails if `it.only` or `describe.only` is committed again.
- The suite remains green when executed multiple times in a row.

### Agent prompt

```text
You are working in the repository node-red-contrib-components.

Task: restore the real automated test suite and make the existing runtime specs deterministic.

Context:
- npm test currently executes only one test because a spec contains it.only.
- Some specs mutate shared flow definitions in place, which makes tests order-dependent.
- The relevant files are under components/test.

Implementation goals:
1. Remove any focused tests such as it.only or describe.only.
2. Refactor specs so each test gets a fresh flow fixture instead of mutating shared objects.
3. Add a lightweight CI-safe guard that fails if focused tests are committed again.
4. Keep the current test scenarios, but improve structure and reliability.

Constraints:
- Keep changes minimal and consistent with the current test style.
- Do not change production behavior unless a test cannot be fixed otherwise.
- Prefer small helper builders inside the test files over introducing a big framework.

Validation:
- Run npm test after the changes.
- If you add a focused-test guard, make sure it is wired into the existing test or CI flow.

Deliverables:
- Updated test files.
- Any required package.json or CI updates.
- A short summary of what was fixed and what the suite now covers.
```

---

## Issue 2: Add real coverage measurement and close major branch gaps in the runtime tests

### Suggested title
Add coverage reporting and cover untested runtime branches

### Area
Tests

### Priority
High

### Problem
The repository has scenario tests, but no coverage measurement and several important branches appear untested. That includes malformed `_comp` state handling, broadcast behavior to multiple callers, status evaluation, legacy target resolution, missing parameter-source cases after API changes, and invalid subflow definitions.

### Evidence

- `package.json` has no coverage tool or threshold.
- The runtime code in `components/run-component.js`, `components/component-start.js`, and `components/component-return.js` contains multiple branches that are not clearly represented in the current specs.
- Several error and fallback branches are only visible through manual inspection and debug logging.

### Why this matters
Without branch coverage, the project can keep adding tests while still missing the paths most likely to fail in production and during upgrades.

### Proposed change

- Add coverage reporting with `c8` or `nyc` and publish text plus lcov output.
- Introduce explicit tests for:
  - invalid or missing `_comp.stack`
  - components with no return nodes
  - broadcast returns to multiple matching caller nodes
  - legacy `targetComponent` fallback paths
  - required parameter without configured source after API change
  - subflow rejection for `component_in` and `component_out`
  - status expression evaluation including JSONata
- Start with practical thresholds and raise them later.

### Acceptance criteria

- Coverage output is available locally and in CI.
- Runtime tests cover the main success and failure branches in all three runtime files.
- A minimum branch coverage threshold is enforced.
- New tests document the expected `_comp` protocol behavior.

### Agent prompt

```text
You are working in the repository node-red-contrib-components.

Task: add automated coverage reporting and extend runtime tests to cover the major untested branches.

Relevant files:
- package.json
- components/run-component.js
- components/component-start.js
- components/component-return.js
- components/test/*

What to implement:
1. Add a coverage tool such as c8 or nyc.
2. Wire coverage into package.json scripts so it can run locally and in CI.
3. Add targeted tests for important missing branches, especially malformed _comp state, in-only behavior, broadcast behavior, legacy targetComponent fallback, API drift around paramSources, subflow rejection, and status evaluation.
4. Add an initial coverage threshold that is realistic for the current codebase.

Constraints:
- Keep test setup readable.
- Prefer focused scenario tests over over-mocked unit tests.
- Do not rewrite the whole suite.

Validation:
- Run the coverage command and the standard test command.
- Report the resulting coverage summary.

Deliverables:
- Updated scripts and dependencies.
- New runtime tests.
- Coverage configuration and thresholds.
```

---

## Issue 3: Fix status evaluation and normalize runtime error handling

### Suggested title
Fix status-expression execution and standardize runtime errors

### Area
Code quality

### Priority
High

### Problem
The runtime has at least one concrete functional bug and several error-handling problems:

- `components/run-component.js` checks `node.propertyType === 'jsonata'` inside `setStatuz`, but the node stores `statuzType`, so JSONata-based status expressions are likely never evaluated through the intended path.
- Multiple places throw strings instead of `Error` objects.
- Several catch blocks call `node.error` with inconsistent arguments or suppress traversal failures entirely.
- Runtime code uses `console.trace` and `console.log` for operational paths, which is noisy and hard to test.

### Evidence

- `components/run-component.js`
- `components/component-start.js`
- `components/component-return.js`

### Why this matters
These problems make failures harder to diagnose, harder to test, and more likely to behave differently across Node-RED versions.

### Proposed change

- Fix status evaluation to use `statuzType` consistently.
- Replace string throws with `new Error(...)`.
- Normalize `node.error` usage so errors are structured and the message payload is passed intentionally.
- Replace debug `console.*` calls with either Node-RED logging or explicit testable error paths.
- Avoid empty catch blocks; if an error is intentionally ignored, document why.

### Acceptance criteria

- JSONata status expressions work as configured.
- Runtime failures surface structured, actionable errors.
- No production runtime path depends on `console.log` or `console.trace`.
- Error-related tests exist for the corrected behavior.

### Agent prompt

```text
You are working in the repository node-red-contrib-components.

Task: fix status-expression handling and normalize runtime error handling across the component nodes.

Relevant files:
- components/run-component.js
- components/component-start.js
- components/component-return.js

Known issues to address:
- setStatuz checks propertyType instead of statuzType.
- Some code throws strings instead of Error instances.
- node.error is called inconsistently.
- There are console.log and console.trace calls in production paths.

Implementation goals:
1. Fix the status evaluation bug.
2. Replace string throws with proper Error objects.
3. Make error reporting consistent and testable.
4. Remove or replace debug console output in runtime code.
5. Add or update tests to lock in the intended behavior.

Constraints:
- Preserve current external behavior where it is already correct.
- Keep the implementation simple and idiomatic for Node-RED nodes.

Validation:
- Run npm test after the changes.
- Add at least one regression test for status handling.

Deliverables:
- Updated runtime files.
- Updated or new tests.
- A short note describing the normalized error contract.
```

---

## Issue 4: Extract routing and stack management into shared helpers and reduce repeated graph scans

### Suggested title
Refactor component routing logic into shared helpers and cache graph analysis

### Area
Code quality

### Priority
Medium

### Problem
The component execution protocol is spread across three runtime files and duplicates traversal logic in the editor code. Graph traversal and topology checks happen repeatedly and recursively, including on message handling paths. The current design works, but it is hard to reason about and harder to optimize or test.

### Evidence

- `findReturnNodes` exists in both `components/component-start.js` and `components/component-start.html`.
- Subflow validation logic is duplicated in `components/component-start.js` and `components/component-return.js`.
- Runtime message handling performs graph discovery on active execution paths.
- `_comp.stack`, `returnNode`, context restoration, and broadcast routing are distributed across files instead of being centralized.

### Why this matters
This is the maintainability bottleneck of the project. Any new feature around context, nested flows, routing modes, or validation will be harder than necessary until the protocol is easier to understand and test.

### Proposed change

- Move graph traversal helpers and `_comp` protocol helpers into shared modules.
- Isolate pure logic from Node-RED glue so it can be tested without booting a full runtime.
- Cache or precompute topology information where possible instead of rediscovering it on each message.
- Document the `_comp` contract in code comments or a small developer document.

### Acceptance criteria

- Shared traversal logic no longer exists in multiple files with divergent behavior.
- The main runtime files become smaller and more focused on Node-RED integration.
- Expensive graph scans are reduced on message hot paths.
- The `_comp` lifecycle is documented and covered by tests.

### Agent prompt

```text
You are working in the repository node-red-contrib-components.

Task: refactor the component routing and stack-management logic into shared helpers and reduce repeated graph scans.

Relevant files:
- components/component-start.js
- components/component-return.js
- components/run-component.js
- components/component-start.html

Goals:
1. Identify duplicated graph traversal and _comp protocol logic.
2. Extract shared helpers into a small internal module or modules.
3. Reduce runtime graph discovery on hot paths by caching or precomputing where practical.
4. Keep behavior backward-compatible.
5. Add targeted tests for the extracted helpers or the resulting runtime behavior.

Constraints:
- Do not introduce unnecessary abstraction.
- Keep Node-RED integration code readable.
- Preserve support for legacy data where the current code already supports it.

Validation:
- Run npm test.
- Explain what work now happens once at setup time versus once per message.

Deliverables:
- Refactored runtime code.
- Any new helper modules.
- Tests and a short description of the _comp contract.
```

---

## Issue 5: Decouple editor scripts from shared globals and replace console-driven validation

### Suggested title
Harden the editor-side code by removing cross-file globals and improving validation UX

### Area
Editor code

### Priority
Medium

### Problem
The editor-side HTML scripts are coupled through implicit global variables and helper functions. For example, `components/run-component.html` and `components/component-return.html` rely on values and helpers defined in `components/component-start.html`. This makes behavior dependent on script load order and increases maintenance risk. In addition, editor validation relies heavily on `console.log` instead of user-facing feedback.

### Evidence

- `COMPONENTS_COLOR`, `COMPONENTS_CATEGORY`, and `findReturnNodes` are declared in `components/component-start.html` and reused elsewhere.
- `components/run-component.html` logs validation failures to the console.
- `components/component-return.html` logs validation state to the console.

### Why this matters
This is the part of the project users experience directly in the editor. Silent or console-only validation is weak UX, and implicit globals make future UI changes brittle.

### Proposed change

- Move shared editor helpers into an explicit shared script module or duplicate the minimum safe logic locally.
- Ensure each node HTML file can stand on its own without relying on another node file's side effects.
- Replace console-only validation feedback with clear field validation, help text, or warnings in the editor.
- Add E2E coverage for the affected editor workflows.

### Acceptance criteria

- No editor node file relies on globals that are defined only in another node file.
- Invalid configuration is visible in the editor without opening the browser console.
- Existing editor behavior remains intact for supported scenarios.

### Agent prompt

```text
You are working in the repository node-red-contrib-components.

Task: make the editor-side node definitions self-contained and improve the validation UX.

Relevant files:
- components/component-start.html
- components/component-return.html
- components/run-component.html

Problems to solve:
- Shared globals and helper functions are defined in one node HTML file and used by others.
- Validation errors are often only logged to the browser console.

Implementation goals:
1. Remove implicit cross-file global dependencies.
2. Keep shared editor logic explicit and maintainable.
3. Improve how validation problems are surfaced in the editor UI.
4. Preserve the current feature set.

Constraints:
- Follow existing Node-RED editor patterns where practical.
- Avoid large UI rewrites.

Validation:
- Verify the three editor node files still load and save correctly.
- Add or update E2E coverage if needed.

Deliverables:
- Updated editor HTML files.
- Any shared helper file if you introduce one.
- A short summary of the removed global couplings.
```

---

## Issue 6: Replace the Puppeteer smoke test with a Playwright-based editor E2E suite

### Suggested title
Introduce Playwright editor E2E tests and retire the current Puppeteer smoke test

### Area
End-to-end testing

### Priority
High

### Problem
The repository contains a browser test under `components/uitest/editor_spec.js`, but it is a Puppeteer smoke test with screenshots and minimal assertions. It does not validate the editor workflows most likely to break for users, and it does not give strong regression protection.

### Evidence

- The current test launches a browser, takes screenshots, drags a node, clicks, and exits.
- Assertions are limited to page availability and selector presence.
- The test depends on a fixed selector from a seeded flow rather than asserting real component behavior.

### Why this matters
The most important editor behaviors cannot be covered well with `node-red-node-test-helper`, because they depend on the Node-RED editor UI. Those workflows need browser-level tests, but the current browser test is not yet targeted at user outcomes.

### Proposed change

- Replace Puppeteer with Playwright for more stable selectors, tracing, retries, and better debugging.
- Start Node-RED in the test harness and run Playwright against the editor.
- Prioritize E2E cases that are editor-specific:
  - selecting a target component in `use comp`
  - rendering the parameter list from the component API
  - changing return node modes and verifying output label changes
  - validating that `component_in` and `component_out` are rejected inside subflows
  - deleting or renaming a referenced component and verifying stale-node feedback
  - import or copy-paste workflows where associations are at risk
- Keep pure runtime protocol tests in `node-red-node-test-helper` instead of duplicating them in the browser.

### What belongs in Playwright vs runtime tests

- Good Playwright candidates:
  - editor validation messages
  - dropdown population and parameter form rendering
  - output-port updates in the UI
  - copy/paste, import/export, and stale-reference behavior
  - interactions that depend on Node-RED editor widgets
- Better as code-level tests:
  - `_comp.stack` behavior
  - nested return routing
  - type validation and broadcast logic
  - message restoration semantics
  - failure handling in runtime event dispatch

### Impact analysis

- Benefits:
  - materially better confidence in editor behavior
  - better debugging through traces, screenshots, and videos
  - clearer separation between UI and runtime responsibilities
- Costs:
  - longer CI time
  - more infrastructure around browser setup
  - maintenance effort for editor selectors and fixtures
- Recommendation:
  - keep the Playwright suite small and targeted, and keep most logic coverage in runtime tests

### Acceptance criteria

- A Playwright-based test harness exists and runs headless in CI.
- The current Puppeteer smoke test is removed or migrated.
- At least three high-value editor workflows are covered end-to-end.
- Playwright artifacts are retained on failure in CI.

### Agent prompt

```text
You are working in the repository node-red-contrib-components.

Task: replace the current Puppeteer smoke test with a focused Playwright-based editor E2E suite.

Relevant files:
- components/uitest/editor_spec.js
- components/uitest/package.json
- components/uitest/settings.js
- components/uitest/flows.json
- GitHub Actions workflow files if CI integration is needed

Goals:
1. Introduce Playwright as the browser E2E framework.
2. Start Node-RED inside the test harness and run Playwright against the editor.
3. Cover a small set of high-value editor workflows: component selection, parameter rendering, output-port behavior, and at least one invalid configuration workflow.
4. Remove or migrate the existing Puppeteer smoke test.
5. Make failures diagnosable with traces/screenshots.

Important scope decision:
- Keep runtime protocol logic in node-red-node-test-helper tests.
- Use Playwright only for behaviors that truly require the editor UI.

Constraints:
- Keep the suite as small and stable as possible.
- Prefer resilient selectors.
- Avoid brittle drag-and-drop-only tests unless the behavior cannot be asserted another way.

Validation:
- Run the E2E suite locally.
- If integrated into CI, make sure artifacts are uploaded on failure.

Deliverables:
- Playwright-based test setup.
- Migrated editor E2E tests.
- Any needed CI integration.
```

---

## Issue 7: Define a supported Node.js and Node-RED matrix and upgrade the toolchain accordingly

### Suggested title
Define support matrix and modernize development dependencies

### Area
Compatibility

### Priority
Medium

### Problem
The project uses a very old development toolchain in `package.json` and currently runs with deprecation warnings on a modern Node.js runtime. There is no declared support matrix for Node.js or Node-RED, and there are no `engines` or compatibility notes in the package metadata.

### Evidence

- `package.json` uses old devDependencies such as Node-RED 1.2.x, Mocha 7.x, and Puppeteer 12.x.
- Running the tests on Node.js 22 emits multiple deprecation warnings from the toolchain.
- The README does not state which Node.js or Node-RED versions are supported.

### Why this matters
Users and maintainers need to know what versions are supported before the project can safely modernize CI and publishing. Without that contract, every upgrade is guesswork.

### Proposed change

- Decide which Node.js and Node-RED versions the project officially supports.
- Add `engines` and README compatibility information.
- Upgrade test and browser tooling to versions that match the chosen support matrix.
- Run CI against that matrix instead of one implicit environment.

### Acceptance criteria

- Supported Node.js and Node-RED versions are documented.
- `package.json` reflects the intended compatibility contract.
- The development toolchain is aligned with the supported versions.
- CI verifies the declared matrix.

### Agent prompt

```text
You are working in the repository node-red-contrib-components.

Task: define the supported Node.js and Node-RED matrix and modernize the development toolchain accordingly.

Relevant files:
- package.json
- package-lock.json
- README.md
- .github/workflows/*
- components/uitest/package.json if browser tooling is updated

Goals:
1. Decide and document the supported Node.js and Node-RED versions.
2. Add package metadata such as engines if appropriate.
3. Upgrade development dependencies to versions compatible with that support matrix.
4. Align CI with the declared matrix.

Constraints:
- Preserve compatibility for users where possible.
- If a breaking compatibility change is necessary, document it clearly.

Validation:
- Run the relevant test suites on the updated toolchain.
- Summarize any compatibility decisions that affect users.

Deliverables:
- Updated package metadata and dependencies.
- Updated README compatibility section.
- Updated CI matrix.
```

---

## Issue 8: Rewrite the README for installation, compatibility, limitations, and real user workflows

### Suggested title
Rewrite README for clarity, compatibility, and maintainability

### Area
Documentation

### Priority
Medium

### Problem
The README contains useful background, but it is not yet a strong package landing page for GitHub or npm. It mixes concepts, historical notes, ideas, and limitations without a clear path for new users. It also contains outdated statements and several text quality issues.

### Evidence

- The README says only required parameters are validated, but the runtime validates more than that.
- The document uses historical/internal naming and does not consistently align with the actual palette labels users see.
- The limitations section is buried and mixed with roadmap ideas.
- Image paths use absolute `/images/...` references, which are fragile for npm rendering.

### Why this matters
For a Node-RED package, the README is the product page. It directly affects adoption, issue quality, and support effort.

### Proposed change

- Restructure the README into:
  - what the package does
  - when to use it instead of subflows
  - compatibility matrix
  - installation
  - node overview with actual editor labels
  - step-by-step example
  - limitations and known caveats
  - examples included in the repo
  - development and test instructions
- Fix outdated statements and visible typos.
- Replace fragile image references with links that render correctly on GitHub and npm.
- Move speculative roadmap items into a separate section or issue tracker reference.

### Acceptance criteria

- A new user can understand the package and run a first example from the README alone.
- Compatibility and limitations are explicit.
- Images render correctly where the README is published.
- The document reflects the current implementation rather than historical intent.

### Agent prompt

```text
You are working in the repository node-red-contrib-components.

Task: rewrite the README so it works as a clear package landing page for both GitHub and npm.

Relevant files:
- README.md
- package.json
- examples/*
- images/*

Goals:
1. Restructure the README around actual user workflows.
2. Add a clear compatibility section.
3. Make installation and first use easy to follow.
4. Document known limitations explicitly.
5. Fix broken or fragile image references.
6. Remove outdated statements that no longer match the runtime behavior.

Constraints:
- Keep the tone practical and concise.
- Reuse existing examples where possible.

Validation:
- Check the markdown renders cleanly.
- Make sure image links work in the intended publication context.

Deliverables:
- Updated README.md.
- Any supporting adjustments to examples or image links.
```

---

## Issue 9: Restrict the npm package contents and add release-hygiene checks

### Suggested title
Whitelist published files and add npm package validation

### Area
Release engineering

### Priority
High

### Problem
The current package contents are much broader than necessary. `npm pack --dry-run` shows that the published tarball includes internal workflow files, VS Code settings, tests, UI-test fixtures, and other development-only assets.

### Evidence

- The dry-run tarball includes `.github/workflows/*`, `.vscode/launch.json`, `components/test/*`, and `components/uitest/*`.
- `package.json` has no `files` whitelist.
- There is no explicit prepublish validation step.

### Why this matters
Publishing internal files increases package size, leaks implementation details, and makes releases less intentional. It also makes npm publication harder to reason about and easier to get wrong.

### Proposed change

- Add a `files` whitelist in `package.json` or a strict `.npmignore`.
- Keep only the runtime node files, locales, examples meant for users, images needed by the README, license, and README.
- Add a release check that runs `npm pack --dry-run` and verifies expected contents.
- Consider a small script or snapshot to guard against accidental publish drift.

### Acceptance criteria

- The npm tarball contains only intended user-facing files.
- Tests, CI configs, editor dev assets, and local VS Code files are excluded.
- A release validation step exists and is automated.
- The README still renders correctly after package-content cleanup.

### Agent prompt

```text
You are working in the repository node-red-contrib-components.

Task: tighten npm package contents and add a validation step for publish hygiene.

Relevant files:
- package.json
- package-lock.json if scripts change
- README.md if asset paths need adjustment
- any new helper script you create for validation

Current issue:
- npm pack --dry-run shows internal files such as workflows, VS Code config, tests, and UI-test assets being included in the package.

Goals:
1. Add a strict files whitelist or equivalent.
2. Ensure only intended runtime and documentation assets are published.
3. Add an automated validation step based on npm pack --dry-run.
4. Keep the package usable for end users.

Constraints:
- Do not accidentally exclude required Node-RED runtime files, locales, or examples.
- Keep the release flow simple.

Validation:
- Run npm pack --dry-run and summarize the resulting package contents.

Deliverables:
- Updated package publishing configuration.
- Any validation script or CI wiring needed.
- A short summary of what is now included and excluded.
```

---

## Issue 10: Modernize GitHub Actions and replace branch-push publishing with a tag-based npm release

### Suggested title
Modernize CI and switch npm publishing to a tag-based provenance workflow

### Area
GitHub Actions / npm deployment

### Priority
High

### Problem
The current GitHub Actions setup is minimal and outdated:

- workflows use old `actions/checkout@v2`
- installs use `npm install` instead of `npm ci`
- there is no dependency cache, no test matrix, and no artifact handling
- publishing is triggered by pushes to `master`
- the publish job uses `mikeal/merge-release@master`, a floating third-party action
- there is no explicit package validation, no provenance, and no version/tag gate

### Evidence

- `.github/workflows/ci-build.yml`
- `.github/workflows/npm-publish.yml`

### Why this matters
This is the highest release risk in the repository. Publishing to npm should be deliberate, reproducible, and auditable. The current workflow makes accidental or non-repeatable releases too easy.

### Proposed change

- Update CI to use modern action versions and `actions/setup-node`.
- Use `npm ci` and enable npm cache.
- Split responsibilities clearly:
  - CI workflow for lint/test/coverage/pack checks on PRs and pushes
  - Release workflow for publishing only from version tags such as `v0.3.5`
- Replace the third-party publish action with direct `npm publish`.
- Add `permissions` explicitly and use `id-token: write` for npm provenance if supported.
- Validate that the tag version matches `package.json` before publishing.
- Upload test and Playwright artifacts on failure where relevant.

### Acceptance criteria

- CI uses maintained GitHub actions and reproducible installs.
- npm publication happens only from an explicit release trigger such as a semver tag or manual dispatch.
- The workflow validates package contents before publishing.
- npm publish is auditable and does not depend on a floating third-party action.

### Agent prompt

```text
You are working in the repository node-red-contrib-components.

Task: modernize the GitHub Actions workflows and replace the current npm publish flow with a tag-based, reproducible release process.

Relevant files:
- .github/workflows/ci-build.yml
- .github/workflows/npm-publish.yml
- package.json

Problems to address:
- Old action versions.
- npm install instead of npm ci.
- No cache or matrix.
- Publish on master push.
- Floating third-party action mikeal/merge-release@master.
- No explicit version/tag validation or provenance.

Goals:
1. Modernize CI with actions/setup-node, npm ci, caching, and the relevant test commands.
2. Add coverage or pack validation if those scripts exist.
3. Change publishing to an explicit release mechanism, ideally semver tags.
4. Publish directly with npm publish instead of a floating third-party action.
5. Add version/tag checks and least-privilege permissions.
6. If browser E2E tests exist, upload artifacts on failure.

Constraints:
- Keep the workflow understandable for maintainers.
- Focus on safe npm deployment.

Validation:
- Lint the workflow syntax if possible.
- Explain the new release trigger and secret requirements.

Deliverables:
- Updated GitHub Actions workflows.
- Any needed package script changes.
- A short release-process summary for maintainers.
```

---

## Recommended implementation order

1. Issue 1: restore the real test suite.
2. Issue 3: fix the runtime status and error-handling defects.
3. Issue 9: restrict package contents.
4. Issue 10: modernize CI and publishing.
5. Issue 2: add coverage and close branch gaps.
6. Issue 6: introduce Playwright E2E coverage.
7. Issue 4 and Issue 5: refactor runtime and editor maintainability.
8. Issue 7 and Issue 8: formalize compatibility and improve documentation.