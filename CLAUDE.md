# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Playwright + TypeScript suite for the Menu section of greggs.com (an external public website, not an app in this repo), built for a QA engineer test brief. There is no application code here, only tests.

The repo is at its initial scaffold stage: `tests/` is empty and `package.json` defines no npm scripts. Use `npx playwright` directly.

## Conventions

- All tests live in `tests/`. Run them with `npx playwright test`.
- Locate elements by role or visible text (`getByRole`, `getByText`, `getByLabel`), never by CSS classes, because the live site's markup can change without notice.
- Dismiss the cookie banner in a shared fixture that every test uses. Don't handle it inside individual tests.
- `@axe-core/playwright` is installed. Use `AxeBuilder` from it for accessibility checks.

## Commands

```bash
npm ci                                   # install dependencies
npx playwright install --with-deps       # install browsers (chromium, firefox, webkit)
npx playwright test                      # run all tests on all three browser projects
npx playwright test tests/menu.spec.ts   # run a single file
npx playwright test -g "test title"      # run tests matching a title
npx playwright test --project=chromium   # run on one browser only
npx playwright test --ui                 # interactive UI mode
npx playwright test --debug              # step through with the inspector
npx playwright show-report               # open the last HTML report
npx playwright codegen <url>             # record locators against the live site
```

## Configuration notes (`playwright.config.ts`)

- `testDir` is `./tests`. Name test files `*.spec.ts`.
- `baseURL` is `https://www.greggs.com`, so use relative paths like `page.goto('/menu')`.
- Two projects run fully parallel: `desktop-chromium` (1280×800) and `mobile-chromium` (Pixel 5). Every test runs on both.
- With `CI` set: `test.only` fails the build, retries are 1, and workers are 1. Traces are captured on first retry and screenshots on failure.
- Reporters are `html` and `list`; output goes to `playwright-report/` and `test-results/` (both gitignored).

## Test structure

- `tests/fixtures.ts` exports `test` and `expect`. Specs import from here, not from `@playwright/test`. The `menuPage` fixture opens `/menu`, accepts cookies if the banner shows within 5s, and waits for a product card.
- `tests/pages/menu.page.ts` is a thin page object containing locators and a few helpers.
- Product cards are located by `[data-test-card]`, an intentional exception to the role-locator rule. Every view also contains a "Greggs App" promo `h2`, which `sectionHeadings` filters out. Headings look upper-case on screen because of CSS, so match on their title-case accessible names.

## CI

`.github/workflows/playwright.yml` runs `npx playwright test` on push and PR to `main`/`master` (Ubuntu, Node LTS) and uploads `playwright-report/` as an artifact kept for 30 days.
