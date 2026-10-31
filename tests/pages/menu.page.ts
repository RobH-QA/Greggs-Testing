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
  /* The filter modal has no accessible name, so identify it by its "Filters" heading */
  readonly filtersDialog: Locator;

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
    this.filtersDialog = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Filters' }) });
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

  /* Active-filter chip, e.g. "Search: steak" */
  filterChip(label: string): Locator {
    return this.main.getByText(new RegExp(`^${escapeRegExp(label)}`));
  }

  chipRemoveButton(label: string): Locator {
    return this.filterChip(label).getByRole('button', { name: 'Remove filter' });
  }

  async search(term: string) {
    await this.searchBox.fill(term);
  }

  /* Search and filters update live, so poll until the card count stops changing */
  async settledCardCount({ stableFor = 1_000, interval = 250, timeout = 10_000 } = {}): Promise<number> {
    const deadline = Date.now() + timeout;
    let last = await this.productCards.count();
    let stableSince = Date.now();
    while (Date.now() < deadline) {
      await this.page.waitForTimeout(interval);
      const current = await this.productCards.count();
      if (current !== last) {
        last = current;
        stableSince = Date.now();
      } else if (Date.now() - stableSince >= stableFor) {
        return current;
      }
    }
    return last;
  }

  async openFilters() {
    await this.filterButton.click();
    await this.filtersDialog.waitFor({ state: 'visible' });
  }

  /* Matches allergen labels ("No Milk") and category labels with their count suffix ("Breakfast (19)") */
  async tickOption(label: string) {
    await this.filtersDialog
      .getByRole('checkbox', { name: new RegExp(`^${escapeRegExp(label)}( \\(\\d+\\))?$`) })
      .check();
  }

  async applyFilters() {
    await this.filtersDialog.getByRole('button', { name: 'Apply filters' }).click();
    await this.filtersDialog.waitFor({ state: 'hidden' });
  }

  /* "Clear all" applies immediately and leaves the modal open. It is only clickable once an option is selected */
  async clearAllFilters() {
    await this.filtersDialog.getByRole('button', { name: 'Clear all' }).click();
  }

  /* The badge is an unlabelled span inside the button, so read it from the button's text ("Filter results1") */
  async readBadgeCount(): Promise<number> {
    const text = (await this.filterButton.textContent()) ?? '';
    const match = text.match(/(\d+)\s*$/);
    return match ? Number(match[1]) : 0;
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
