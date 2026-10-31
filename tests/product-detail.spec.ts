import { test, expect } from './fixtures';
import { CATEGORIES, CATEGORY_SLUGS } from './pages/menu.page';
import { ProductPage } from './pages/product.page';
import { parseNumber, parseNumberWithUnit } from './helpers/parse';

/* Traffic-light summary label -> nutrition table row label */
const SUMMARY_TO_TABLE = [
  { summary: 'Fat', table: 'Fat' },
  { summary: 'Saturates', table: 'of which Saturates' },
  { summary: 'Sugar', table: 'of which Sugars' },
  { summary: 'Salt', table: 'Salt' },
];

test.describe('Product detail nutrition', () => {
  for (const category of CATEGORIES) {
    test(`${category}: first product's summary matches its nutrition table`, async ({ menuPage, page }) => {
      await page.goto(`/menu?category=${CATEGORY_SLUGS[category]}`);
      await expect(menuPage.sectionHeadings).toHaveAccessibleName(category);
      const firstCard = menuPage.productCards.first();
      const productName = (await menuPage.cardTitle(firstCard).textContent())?.trim();
      await firstCard.click();

      const product = new ProductPage(page);
      await expect(product.heading).toHaveText(productName!);
      await expect(product.nutritionTable).toBeVisible();

      await test.step('energy (kcal) summary equals per-portion column', async () => {
        const summaryKcal = parseNumberWithUnit(await product.summaryItem('Energy').textContent(), 'kcal');
        const tableKcal = parseNumber(await product.perPortionCell('Energy kcal').textContent());
        expect(summaryKcal).toBe(tableKcal);
      });

      for (const { summary, table } of SUMMARY_TO_TABLE) {
        await test.step(`${summary} summary equals per-portion column`, async () => {
          const summaryValue = parseNumber(await product.summaryItem(summary).textContent());
          const tableValue = parseNumber(await product.perPortionCell(table).textContent());
          expect(summaryValue).toBe(tableValue);
        });
      }

      await test.step('typical values per 100 line matches per-100 column for energy', async () => {
        await expect(product.typicalValuesLine).toBeVisible();
        const line = await product.typicalValuesLine.textContent();
        expect(parseNumberWithUnit(line, 'kJ')).toBe(parseNumber(await product.per100Cell('Energy kJ').textContent()));
        expect(parseNumberWithUnit(line, 'kcal')).toBe(parseNumber(await product.per100Cell('Energy kcal').textContent()));
      });

      await expect(product.allergenLine).toBeVisible();
    });
  }
});
