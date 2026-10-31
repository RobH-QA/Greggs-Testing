import { test as base, expect } from '@playwright/test';
import { MenuPage } from './pages/menu.page';

type Fixtures = {
  menuPage: MenuPage;
};

export const test = base.extend<Fixtures>({
  menuPage: async ({ page }, use) => {
    await page.goto('/menu');

    /* The OneTrust banner doesn't always appear (e.g. consent already stored), so only click it if it shows */
    const acceptCookies = page.getByRole('button', { name: 'Accept all cookies' });
    const bannerShown = await acceptCookies
      .waitFor({ state: 'visible', timeout: 5_000 })
      .then(() => true, () => false);
    if (bannerShown) await acceptCookies.click();

    const menuPage = new MenuPage(page);
    await expect(menuPage.productCards.first()).toBeVisible();
    await use(menuPage);
  },
});

export { expect };
