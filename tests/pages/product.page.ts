import type { Locator, Page } from '@playwright/test';

/* Table columns: [icon, label, per 100g/ml, per portion] */
const PER_100_COLUMN = 2;
const PER_PORTION_COLUMN = 3;

export class ProductPage {
  readonly main: Locator;
  readonly heading: Locator;
  /* Traffic-light list under "Each <product> (<weight>) contains:" */
  readonly nutritionSummary: Locator;
  readonly nutritionTable: Locator;
  /* " Typical values (as sold) per 100g: 1130 kJ/269 kcal"; drinks use per 100ml */
  readonly typicalValuesLine: Locator;
  /* " Allergens*: Soya, Wheat" (note the leading space) */
  readonly allergenLine: Locator;

  constructor(readonly page: Page) {
    this.main = page.getByRole('main');
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.nutritionSummary = this.main
      .getByRole('list')
      .filter({ has: page.getByRole('listitem').filter({ hasText: /^\s*Energy/ }) });
    this.nutritionTable = this.main.getByRole('table');
    this.typicalValuesLine = this.main.getByText(/^\s*Typical values \(as sold\) per 100(g|ml):/i);
    this.allergenLine = this.main.getByText(/^\s*Allergens\*:/);
  }

  summaryItem(label: string): Locator {
    return this.nutritionSummary.getByRole('listitem').filter({ hasText: new RegExp(`^\\s*${label}`) });
  }

  tableRow(label: string): Locator {
    return this.nutritionTable
      .getByRole('row')
      .filter({ has: this.page.getByRole('cell', { name: label, exact: true }) });
  }

  per100Cell(label: string): Locator {
    return this.tableRow(label).getByRole('cell').nth(PER_100_COLUMN);
  }

  perPortionCell(label: string): Locator {
    return this.tableRow(label).getByRole('cell').nth(PER_PORTION_COLUMN);
  }
}
