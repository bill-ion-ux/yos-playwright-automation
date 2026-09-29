import { Page, Locator } from '@playwright/test';

export abstract class BaseComponent {
  constructor(protected page: Page, protected root: Locator) {}
}
