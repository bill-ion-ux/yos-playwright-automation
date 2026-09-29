import { expect, type Locator, Page } from "@playwright/test";
import { BasePage } from "./base.page";
import { Customer } from "../support/identity";

export class DeliveryAddressPage extends BasePage {
    private addressInput : Locator;
    private unitNoInput : Locator;
    private postalCodeInput : Locator;
    private stateInput : Locator;
    private cityInput : Locator;
    private nextButton : Locator;

    constructor(page: Page){
        super(page);
        this.addressInput = page.getByRole('textbox', { name: 'Address *' });
        this.unitNoInput = page.getByRole('textbox', { name: 'Unit No.' });
        this.postalCodeInput = page.getByRole('textbox', { name: 'Postal Code *' });
        this.stateInput = page.getByRole('textbox', { name: 'State *' });
        this.cityInput = page.getByRole('textbox', { name: 'City *' });
        this.nextButton = page.getByRole('button', { name: 'Next' });
    }
    async fillDeliveryAdress(mock: Pick<Customer, 'address' | 'unitNo' | 'postalCode' | 'state' | 'city'>) {
        await this.addressInput.fill(mock.address);
        await this.unitNoInput.fill(mock.unitNo);
        await this.postalCodeInput.fill(mock.postalCode);
        await expect(this.stateInput).toHaveValue(mock.state);
        await expect(this.cityInput).toHaveValue(mock.city);
    }

    async clickNext() {
        await expect(this.nextButton).toBeEnabled();
        await this.nextButton.click();
    }
}