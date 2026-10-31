import { test, expect } from './fixtures';

test.describe('Menu filters', () => {
  test('Breakfast category filter shows only the Breakfast section', async ({ menuPage }) => {
    await menuPage.openFilters();
    await menuPage.tickOption('Breakfast');
    await menuPage.applyFilters();

    await expect(menuPage.sectionHeadings).toHaveCount(1);
    await expect(menuPage.sectionHeadings).toHaveAccessibleName('Breakfast');
  });

  test('"No Milk" results do not list Milk as an allergen', async ({ menuPage, page }) => {
    const fullCount = await menuPage.settledCardCount();

    await menuPage.openFilters();
    await menuPage.tickOption('No Milk');
    await menuPage.applyFilters();

    await expect.poll(() => menuPage.readBadgeCount()).toBe(1);
    await expect.poll(() => menuPage.productCards.count()).toBeLessThan(fullCount);
    const links = (await menuPage.productCards.evaluateAll((cards) =>
      cards.map((card) => card.getAttribute('href')))).slice(0, 3);
    expect(links).toHaveLength(3);

    for (const link of links) {
      await test.step(`product ${link}`, async () => {
        await page.goto(link!);
        /* Product pages render allergens as a single line, e.g. " Allergens*: Soya, Wheat" (note the leading space) */
        const allergenLine = page.getByRole('main').getByText(/^\s*Allergens\*:/);
        await expect(allergenLine).toBeVisible();
        await expect(allergenLine).not.toContainText(/milk/i);
      });
    }
  });

  test('Clear all restores the full menu and removes the badge', async ({ menuPage }) => {
    const fullCount = await menuPage.settledCardCount();

    await menuPage.openFilters();
    await menuPage.tickOption('No Milk');
    await menuPage.applyFilters();
    await expect.poll(() => menuPage.readBadgeCount()).toBe(1);
    await expect.poll(() => menuPage.productCards.count()).toBeLessThan(fullCount);

    await menuPage.openFilters();
    await menuPage.clearAllFilters();

    await expect(menuPage.productCards).toHaveCount(fullCount);
    await expect.poll(() => menuPage.readBadgeCount()).toBe(0);
  });
});
