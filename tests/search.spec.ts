import { test, expect } from './fixtures';

test.describe('Menu search', () => {
  test('"steak" shows only matching products', async ({ menuPage }) => {
    await menuPage.search('steak');
    await expect(menuPage.filterChip('Search: steak')).toBeVisible();

    expect(await menuPage.settledCardCount()).toBeGreaterThan(0);
    const titles = await menuPage.productCards.getByRole('heading', { level: 3 }).allTextContents();
    for (const title of titles) {
      expect(title, `card "${title}"`).toMatch(/steak/i);
    }
  });

  test('removing the search chip restores the full menu', async ({ menuPage }) => {
    const fullCount = await menuPage.settledCardCount();

    await menuPage.search('steak');
    await expect(menuPage.filterChip('Search: steak')).toBeVisible();
    expect(await menuPage.settledCardCount()).toBeLessThan(fullCount);

    await menuPage.chipRemoveButton('Search: steak').click();

    await expect(menuPage.filterChip('Search: steak')).toBeHidden();
    await expect(menuPage.productCards).toHaveCount(fullCount);
    await expect(menuPage.searchBox).toHaveValue('');
  });

  test('a term with no matches shows the empty state', async ({ menuPage }) => {
    await menuPage.search('zzzzqqq');

    await expect(menuPage.emptyState).toBeVisible();
    await expect(menuPage.productCards).toHaveCount(0);
  });
});
