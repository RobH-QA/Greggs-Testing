import type { Locator, Page } from '@playwright/test';

export const CATEGORIES = [
  'Breakfast',
  'Savouries & Bakes',
  'Drinks & Snacks',
  'Sandwiches & Salads',
  'Sweet Treats',
  'Hot Food',
] as const;

export type Category = (typeof CATEGORIES)[number] | 'All';

export class MenuPage {
  readonly main: Locator;
  readonly searchBox: Locator;
  readonly filterButton: Locator;
  readonly productCards: Locator;
  /* Category h2s only; every view also has a "Greggs App" promo h2 */
  readonly sectionHeadings: Locator;
  readonly emptyState: Locator;

  constructor(readonly page: Page) {
    this.main = page.getByRole('main');
    this.searchBox = this.main.getByRole('searchbox', { name: 'Search for a product' });
    this.filterButton = this.main.getByRole('button', { name: /^Filter results/ });
    this.productCards = this.main.locator('[data-test-card]');
    this.sectionHeadings = this.main
      .getByRole('heading', { level: 2 })
      .filter({ hasNotText: /greggs app/i })
      .filter({ hasNotText: /could not find any products/i });
    this.emptyState = this.main.getByText('Oops... we could not find any products matching your criteria');
  }

  categoryPill(name: Category): Locator {
    return this.main.getByRole('button', { name, exact: true });
  }

  sectionHeading(name: (typeof CATEGORIES)[number]): Locator {
    return this.main.getByRole('heading', { level: 2, name, exact: true });
  }

  async selectCategory(name: Category) {
    await this.categoryPill(name).click();
  }

  cardTitle(card: Locator): Locator {
    return card.getByRole('heading', { level: 3 });
  }
}
