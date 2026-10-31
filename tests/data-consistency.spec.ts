import { test, expect } from './fixtures';
import { CATEGORIES, CATEGORY_SLUGS } from './pages/menu.page';

test.describe('Menu data consistency', () => {
  test('category pill card counts match the filter dialog counts', async ({ menuPage }) => {
    await menuPage.openFilters();
    const counts = await menuPage.readCategoryCounts();
    await menuPage.closeFilters();

    for (const category of CATEGORIES) {
      await test.step(`${category} (${counts[category]})`, async () => {
        expect(counts[category], `dialog count for ${category}`).toBeGreaterThan(0);
        await menuPage.selectCategory(category);
        await expect(menuPage.productCards).toHaveCount(counts[category]);
      });
    }

    const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
    await menuPage.selectCategory('All');
    await expect(menuPage.productCards).toHaveCount(total);
  });

  for (const category of CATEGORIES) {
    test(`${category}: cards have unique names and loaded images`, async ({ menuPage, page }) => {
      await menuPage.selectCategory(category);
      await expect(page).toHaveURL(new RegExp(`[?&]category=${CATEGORY_SLUGS[category]}(&|$)`));
      await expect(menuPage.sectionHeadings).toHaveAccessibleName(category);
      await menuPage.settledCardCount();

      const titles = (await menuPage.productCards.getByRole('heading', { level: 3 }).allTextContents())
        .map((title) => title.trim());
      expect(titles.length).toBeGreaterThan(0);
      expect(titles.filter((title) => title === ''), 'cards with an empty h3').toEqual([]);
      expect(titles.filter((title, i) => titles.indexOf(title) !== i), 'duplicate names').toEqual([]);

      const cardCount = await menuPage.productCards.count();
      expect(await menuPage.productCards.getByRole('heading', { level: 3 }).count()).toBe(cardCount);

      /* Card images are lazy-loaded, so bring each into view before checking it decoded */
      for (let i = 0; i < cardCount; i++) {
        const card = menuPage.productCards.nth(i);
        const image = card.getByRole('img');
        await card.scrollIntoViewIfNeeded();
        await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete ? img.naturalWidth : 0),
          { message: `image for "${titles[i]}"`, timeout: 10_000 }).toBeGreaterThan(0);
      }
    });
  }
});
