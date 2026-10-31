import AxeBuilder from '@axe-core/playwright';
import type { Page, TestInfo } from '@playwright/test';
import { test, expect } from './fixtures';

/* Known serious violations, recorded in CLAUDE.md Findings. Matched by rule and element text so new ones still fail */
const KNOWN_SERIOUS = [
  { id: 'color-contrast', text: /^Delivery$/, note: '"Delivery" ways-to-order tile: white on #4dabe9, 2.52:1 (needs 3:1)' },
];

async function scan(page: Page, testInfo: TestInfo) {
  /* The OneTrust banner fades out after "Accept all cookies"; scanning mid-fade reports its buttons */
  await expect(page.getByRole('dialog', { name: 'Privacy' })).toBeHidden();
  /* Client-side route changes fade content in; mid-transition colours read as false contrast failures */
  await page.evaluate(() => Promise.all(document.getAnimations().map((animation) => animation.finished)));
  const results = await new AxeBuilder({ page }).analyze();
  await testInfo.attach('axe-results', { body: JSON.stringify(results.violations, null, 2), contentType: 'application/json' });

  const blocking = [];
  for (const violation of results.violations) {
    const serious = violation.impact === 'serious' || violation.impact === 'critical';
    for (const node of violation.nodes) {
      /* axe's node.html is only the opening tag, so read the element's text via its reported selector */
      const text = await page.evaluate((selector) => document.querySelector(selector)?.textContent?.trim() ?? '',
        node.target.join(' '));
      const known = KNOWN_SERIOUS.find((k) => k.id === violation.id && k.text.test(text));
      const line = `[${violation.impact}] ${violation.id}: ${node.target.join(' ')} ${node.html.slice(0, 120)}`;
      if (!serious) console.log(`axe (not failing) ${line}`);
      else if (known) testInfo.annotations.push({ type: 'known a11y finding', description: `${known.note} — ${line}` });
      else blocking.push(line);
    }
  }
  return blocking;
}

test.describe('Accessibility', () => {
  test('axe: /menu has no new serious or critical violations', async ({ menuPage, page }, testInfo) => {
    await expect(menuPage.productCards.first()).toBeVisible();
    expect(await scan(page, testInfo)).toEqual([]);
  });

  test('axe: product page has no new serious or critical violations', async ({ menuPage, page }, testInfo) => {
    await menuPage.productCards.first().click();
    await expect(page.getByRole('main').getByRole('table')).toBeVisible();
    expect(await scan(page, testInfo)).toEqual([]);
  });

  test.describe('known findings (expected to fail until fixed)', () => {
    test('filter dialog has an accessible name', async ({ menuPage }) => {
      test.fail(true, 'Finding: the filter modal (role="dialog") has no accessible name.');
      await menuPage.openFilters();
      await expect(menuPage.filtersDialog).toHaveAccessibleName(/\S/, { timeout: 2_000 });
    });

    test('filter dialog close button has an accessible name', async ({ menuPage }) => {
      test.fail(true, "Finding: the filter modal's close button is an icon with no accessible name.");
      await menuPage.openFilters();
      await expect(menuPage.filtersCloseButton).toHaveAccessibleName(/\S/, { timeout: 2_000 });
    });

    test('Filter results button exposes aria-expanded', async ({ menuPage }) => {
      test.fail(true, 'Finding: "Filter results" does not expose aria-expanded when the modal opens or closes.');
      await expect(menuPage.filterButton).toHaveAttribute('aria-expanded', 'false', { timeout: 2_000 });
      await menuPage.openFilters();
      await expect(menuPage.filterButton).toHaveAttribute('aria-expanded', 'true', { timeout: 2_000 });
    });

    test('Clear all is disabled when nothing is ticked', async ({ menuPage }) => {
      test.fail(true, 'Finding: "Clear all" is styled disabled but lacks disabled/aria-disabled.');
      await menuPage.openFilters();
      await expect(menuPage.clearAllButton).toBeDisabled({ timeout: 2_000 });
    });

    test('"Delivery" tile text meets colour contrast', async ({ menuPage, page }) => {
      test.fail(true, `Finding: ${KNOWN_SERIOUS[0].note}`);
      await expect(menuPage.productCards.first()).toBeVisible();
      await page.evaluate(() => Promise.all(document.getAnimations().map((animation) => animation.finished)));

      const results = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
      const deliveryNodes = [];
      for (const node of results.violations.flatMap((violation) => violation.nodes)) {
        const text = await page.evaluate((selector) => document.querySelector(selector)?.textContent?.trim() ?? '',
          node.target.join(' '));
        if (/^Delivery$/.test(text)) deliveryNodes.push(node.target.join(' '));
      }
      expect(deliveryNodes, 'contrast failures on the Delivery tile').toEqual([]);
    });
  });

  test('every card image has non-empty alt text', async ({ menuPage }) => {
    const alts = await menuPage.productCards.getByRole('img').evaluateAll((imgs) =>
      imgs.map((img) => img.getAttribute('alt')?.trim() ?? ''));
    expect(alts.length).toBe(await menuPage.productCards.count());
    expect(alts.filter((alt) => alt === ''), 'images with empty alt').toEqual([]);
  });

  test('Tab from the search box reaches the category pills with visible focus', async ({ menuPage, page }) => {
    const firstPill = menuPage.categoryPill('All');
    await menuPage.searchBox.focus();

    for (let presses = 0; presses < 10; presses++) {
      await page.keyboard.press('Tab');
      if (await firstPill.evaluate((el) => el === document.activeElement)) break;
    }
    await expect(firstPill).toBeFocused();

    /* The site draws focus with a box-shadow ring and outline-style none */
    const focus = await firstPill.evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        focusVisible: el.matches(':focus-visible'),
        outline: style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0,
        boxShadow: style.boxShadow !== 'none',
      };
    });
    expect(focus.focusVisible).toBe(true);
    expect(focus.outline || focus.boxShadow, 'visible focus indicator').toBe(true);
  });

  test('Escape closes the filter dialog and returns focus to Filter results', async ({ menuPage, page }) => {
    await menuPage.openFilters();
    await page.keyboard.press('Escape');

    await expect(menuPage.filtersDialog).toBeHidden();
    await expect(menuPage.filterButton).toBeFocused();
  });
});
