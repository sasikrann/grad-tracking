import type { Page } from '@playwright/test'

export async function mockGoogleIdentity(page: Page) {
  await page.route('https://accounts.google.com/gsi/client', async (route) => {
    await route.fulfill({
      contentType: 'application/javascript',
      body: `
        window.google = {
          accounts: {
            id: {
              initialize(config) {
                window.__googleClientId = config.client_id;
              },
              renderButton(element) {
                const button = document.createElement('button');
                button.type = 'button';
                button.textContent = 'Continue with Google';
                button.setAttribute('aria-label', 'Continue with Google');
                element.appendChild(button);
              }
            }
          }
        };
      `,
    })
  })
}
