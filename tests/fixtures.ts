import { test as base, expect } from '@playwright/test';
import { MenuPage } from './pages/menu.page';

type Fixtures = {
  menuPage: MenuPage;
};

export const test = base.extend<Fixtures>({
  menuPage: async ({ page }, use) => {
    const acceptCookies = page.getByRole('button', { name: 'Accept all cookies' });
    const privacyBanner = page.getByRole('dialog', { name: 'Privacy' });

    await page.goto('/menu');

    /* The OneTrust banner doesn't always appear (e.g. consent already stored), so only click it if it shows */
    const bannerShown = await acceptCookies
      .waitFor({ state: 'visible', timeout: 5_000 })
      .then(() => true, () => false);
    if (bannerShown) {
      await acceptCookies.click();
      /* The banner fades out and its overlay intercepts clicks until it has gone */
      await privacyBanner.waitFor({ state: 'hidden' });
    }

    /* On a slow load the banner can appear after the 5s window. Registered only now, because an explicit click
       on the handler's own locator deadlocks: the handler removes the button the click is still waiting for */
    await page.addLocatorHandler(acceptCookies, async () => {
      await acceptCookies.click();
      await privacyBanner.waitFor({ state: 'hidden' });
    });

    const menuPage = new MenuPage(page);
    await expect(menuPage.productCards.first()).toBeVisible();
    await use(menuPage);
  },
});

export { expect };
