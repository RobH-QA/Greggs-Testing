import { test, expect } from './fixtures';

/* Matches the desktop-chromium project in playwright.config.ts */
const DESKTOP_VIEWPORT = { width: 1280, height: 800 };

test.describe('Responsive layout', () => {
  test('mobile: header nav collapses behind a Menu button', async ({ menuPage, isMobile }) => {
    test.skip(!isMobile, 'mobile only');

    await expect(menuPage.headerMenuButton).toBeVisible();
    /* The collapsed nav stays rendered but is translated above the viewport */
    await expect(menuPage.mainNav.getByRole('button', { name: 'Menu & allergens' })).not.toBeInViewport();
  });

  test('desktop: header nav is shown inline with no Menu button', async ({ menuPage, isMobile }) => {
    test.skip(isMobile, 'desktop only');

    await expect(menuPage.headerMenuButton).toBeHidden();
    await expect(menuPage.mainNav.getByRole('button', { name: 'Menu & allergens' })).toBeInViewport();
  });

  test('mobile: card grid has fewer columns than desktop and every card fits the viewport', async ({ menuPage, page, isMobile }) => {
    test.skip(!isMobile, 'mobile only');

    const mobileColumns = await menuPage.cardColumnCount();
    const overflowing = await menuPage.productCards.evaluateAll((cards) =>
      cards
        .filter((card) => {
          const box = card.getBoundingClientRect();
          return box.left < 0 || box.right > document.documentElement.clientWidth;
        })
        .map((card) => card.getAttribute('href')));
    expect(overflowing, 'cards wider than the viewport').toEqual([]);

    /* Re-measure the same page at the desktop project's viewport */
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await expect.poll(() => menuPage.cardColumnCount()).toBeGreaterThan(mobileColumns);
  });

  test('desktop: card grid is multi-column', async ({ menuPage, isMobile }) => {
    test.skip(isMobile, 'desktop only');

    expect(await menuPage.cardColumnCount()).toBeGreaterThan(2);
  });

  test('page has no horizontal overflow', async ({ menuPage, page }) => {
    await expect(menuPage.productCards.first()).toBeVisible();
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('category pill row scrolls horizontally within its own container', async ({ menuPage }) => {
    const row = await menuPage.pillRow.evaluate((el) => ({
      overflowX: getComputedStyle(el).overflowX,
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }));
    expect(['auto', 'scroll']).toContain(row.overflowX);
    expect(row.scrollWidth).toBeGreaterThan(row.clientWidth);

    await menuPage.categoryPill('Hot Food').scrollIntoViewIfNeeded();
    await expect.poll(() => menuPage.pillRow.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  });

  test('mobile: filter dialog fits the viewport', async ({ menuPage, page, isMobile }) => {
    test.skip(!isMobile, 'mobile only');

    await menuPage.openFilters();
    const box = (await menuPage.filtersDialog.boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
  });
});
