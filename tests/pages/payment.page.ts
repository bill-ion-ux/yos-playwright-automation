import { expect, Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';

export class PaymentPage extends BasePage {
    private onlineBankingOption: Locator;
    private selectBankDropdown: Locator
    private payNowButton: Locator;
    
    
    constructor(page: Page) {
        super(page);
        this.onlineBankingOption = page.locator('label').filter({ hasText: 'Online Banking (FPX)' });
        this.selectBankDropdown = page.locator('#select-bank');
        this.payNowButton = page.getByRole('button', { name: 'Pay Now' });
    }

    async selectOnlineBanking() {
        await this.onlineBankingOption.click();
    }

    async selectBank(bankName: string) {
        await this.selectBankDropdown.selectOption(bankName);
    }

    async clickPayNow() {
        await expect(this.payNowButton).toBeEnabled();
        const popupPromise = this.page.waitForEvent('popup');
        await this.payNowButton.click();
        return await popupPromise;
    }

  
}