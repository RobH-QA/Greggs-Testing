import { test, expect } from './fixtures';

test.describe('Performance', () => {
  test('/menu loads within smoke thresholds', async ({ menuPage, page }) => {
    test.info().annotations.push({
      type: 'smoke check',
      description: 'Catches gross regressions only. Live-site timings vary with network and CDN; this is not a benchmark.',
    });
    await expect(menuPage.productCards.first()).toBeVisible();

    /* loadEventEnd stays 0 until the load event finishes */
    await expect.poll(() => page.evaluate(() =>
      (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming).loadEventEnd)).toBeGreaterThan(0);
    const timing = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return { domContentLoaded: nav.domContentLoadedEventEnd, load: nav.loadEventEnd };
    });
    test.info().annotations.push({
      type: 'timing',
      description: `DOMContentLoaded ${Math.round(timing.domContentLoaded)}ms, load ${Math.round(timing.load)}ms`,
    });

    expect(timing.domContentLoaded).toBeLessThan(3_000);
    expect(timing.load).toBeLessThan(6_000);
  });

  test('card images are lazy-loaded', async ({ menuPage }) => {
    /* Native loading="lazy", or the site's IntersectionObserver wrapper that defers rendering the picture */
    const notLazy = await menuPage.productCards.getByRole('img').evaluateAll((imgs) =>
      imgs
        .filter((img) => img.getAttribute('loading') !== 'lazy' && !img.closest('[data-component="IntersectionObserver"]'))
        .map((img) => img.getAttribute('alt')));
    expect(await menuPage.productCards.count()).toBeGreaterThan(0);
    expect(notLazy, 'card images without a lazy-loading mechanism').toEqual([]);
  });
});
