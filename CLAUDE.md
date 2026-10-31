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
- `tests/pages/menu.page.ts` and `tests/pages/product.page.ts` are thin page objects containing locators and helpers only. Assertions stay in specs. `CATEGORIES` and `CATEGORY_SLUGS` live in `menu.page.ts`.
- `tests/helpers/parse.ts` pulls numbers out of display text (`"Fat12g17%"`, `"283kcal"`). Use it for any nutrition comparison instead of string-matching values.
- Card images are lazy-loaded: scroll each card into view before checking `naturalWidth`. The filter modal's "Back" button is hidden on mobile, so `closeFilters()` presses Escape.
- Product cards are located by `[data-test-card]`, an intentional exception to the role-locator rule. Every view also contains a "Greggs App" promo `h2`, which `sectionHeadings` filters out. Headings look upper-case on screen because of CSS, so match on their title-case accessible names.

## Findings

Observed on the live site on 2026-10-31.

- **Observation (not a defect):** category checkboxes in the filter modal filter the cards but don't add to the "Filter results" badge. Only allergen and calorie filters count. Don't assert a badge for category filters.
- **Accessibility defect:** "Clear all" in the filter modal is styled as disabled (`disabled` class, `pointer-events-none`) when nothing is selected, but has no `disabled` or `aria-disabled` attribute. Screen readers announce it as enabled, and a Playwright click waits until it times out.
- **Accessibility defect:** the filter modal (`role="dialog"`) has no accessible name.
- **Accessibility defect:** the filter modal's close button is an icon with no accessible name.
- **Accessibility defect:** the "Filter results" button doesn't expose `aria-expanded` when the modal opens or closes.
- **Accessibility defect:** each product card link's accessible name repeats the product name (e.g. "Bacon Breakfast Roll Bacon Breakfast Roll"), because the image alt text and the `h3` are both read out. The 143 `image-redundant-alt` (minor) results axe reports on `/menu`, one per card, have the same root cause: the alt text repeats the card's `h3`. Fixing it once, for example with an empty `alt` on the decorative card image, clears both.
- **Accessibility defect (axe serious):** the "Delivery" tile in the ways-to-order strip on `/menu` and product pages fails `color-contrast`: white on `#4dabe9` is 2.52:1, below the 3:1 needed for large text. It's allowlisted by rule and text in the axe scans in `accessibility.spec.ts`, so any new serious violation still fails, and it also has its own `test.fail()` in the known-findings group.
- **Accessibility defect:** the mobile header "Menu" button doesn't expose `aria-expanded` when the nav opens.
- **Observation (not a defect):** on mobile (Pixel 5, 393px) the card grid is 2 columns, not 1. `responsive.spec.ts` asserts fewer columns than at the desktop viewport, not an exact number.

## CI

`.github/workflows/playwright.yml` runs `npx playwright test` on push and PR to `main`/`master` (Ubuntu, Node LTS) and uploads `playwright-report/` as an artifact kept for 30 days.
