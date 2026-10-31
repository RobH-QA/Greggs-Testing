import { test, expect } from './fixtures';
import { CATEGORIES, CATEGORY_SLUGS } from './pages/menu.page';

test.describe('Menu navigation', () => {
  test('menu loads with h1 and product cards', async ({ menuPage }) => {
    await expect(menuPage.main.getByRole('heading', { level: 1, name: /our menu/i })).toBeVisible();
    await expect(menuPage.productCards.first()).toBeVisible();
    expect(await menuPage.productCards.count()).toBeGreaterThan(0);
  });

  for (const category of CATEGORIES) {
    test(`"${category}" pill updates the URL and section heading`, async ({ menuPage, page }) => {
      await menuPage.selectCategory(category);

      await expect(page).toHaveURL(new RegExp(`[?&]category=${CATEGORY_SLUGS[category]}(&|$)`));
      await expect(menuPage.sectionHeadings).toHaveCount(1);
      await expect(menuPage.sectionHeading(category)).toBeVisible();
    });
  }

  test('deep link ?category=hot-food shows only Hot Food', async ({ menuPage, page }) => {
    await page.goto('/menu?category=hot-food');

    await expect(menuPage.sectionHeadings).toHaveCount(1);
    await expect(menuPage.sectionHeadings).toHaveAccessibleName('Hot Food');
    /* Exact per-category counts are checked against the filter modal in a separate spec */
    await expect(menuPage.productCards.first()).toBeVisible();
  });

  test('clicking a card opens its product page', async ({ menuPage, page }) => {
    const firstCard = menuPage.productCards.first();
    const cardTitle = (await menuPage.cardTitle(firstCard).textContent())?.trim() ?? '';
    expect(cardTitle).not.toBe('');

    await firstCard.click();

    await expect(page).toHaveURL(/\/menu\/product\//);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(cardTitle);
  });

  test('browser back restores the category URL', async ({ menuPage, page }) => {
    await menuPage.selectCategory('Hot Food');
    await expect(page).toHaveURL(/[?&]category=hot-food(&|$)/);

    await menuPage.productCards.first().click();
    await expect(page).toHaveURL(/\/menu\/product\//);

    await page.goBack();

    await expect(page).toHaveURL(/[?&]category=hot-food(&|$)/);
    await expect(menuPage.sectionHeading('Hot Food')).toBeVisible();
  });
});
