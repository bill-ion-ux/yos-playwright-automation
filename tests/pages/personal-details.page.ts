import { expect, Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';
import { Customer } from '../support/identity';

export class PersonalDetailsPage extends BasePage {
    private idTypeDropdown: Locator;
    private idNumberInput: Locator;
    private fullNameInput: Locator;
    private genderDropdown: Locator;
    private dobInput: Locator;
    private phoneNumberInput: Locator;
    private emailAddressInput: Locator;
    private subscribePlanLabel: Locator;
    private privacyPolicyLabel: Locator;
    private nextButton: Locator;

    constructor(page: Page) {
        super(page);
        this.idTypeDropdown = page.getByRole('combobox', { name: 'ID Type *' });
        this.idNumberInput = page.getByRole('textbox', { name: 'ID Number' });
        this.fullNameInput = page.getByRole('textbox', { name: 'Full Name *' });
        this.genderDropdown = page.getByRole('combobox', { name: 'Gender *' });
        this.dobInput = page.getByRole('textbox', { name: 'Date Of Birth *' });
        this.phoneNumberInput = page.getByRole('spinbutton', { name: 'Phone Number' });
        this.emailAddressInput = page.getByRole('textbox', { name: /Email (Address|ID) \*/ });
        // Both consent checkboxes sit under a click-intercepting overlay -
        // toggle them via their <label for=...> instead of the input itself.
        this.subscribePlanLabel = page.locator('label[for="input-subscribePlan"]');
        this.privacyPolicyLabel = page.locator('label[for="input-privacyPolicy"]');
        this.nextButton = page.getByRole('button', { name: 'Next' });
    }

    async fillPersonalDetails(
        mock: Pick<Customer, 'idType' | 'idNumber' | 'fullName' | 'dob' | 'gender' | 'phone' | 'email'>,
    ) {
        // ID Number is disabled until an ID Type is chosen - select first.
        // selectOption matches by visible label here so callers can pass
        // 'MyKad' as shown on the page, not the underlying option value.
        await this.idTypeDropdown.selectOption({ label: mock.idType });
        await this.idNumberInput.fill(mock.idNumber);
        await this.fullNameInput.fill(mock.fullName);

        if (mock.idType === 'Passport') {
            // Passport doesn't embed DOB/Gender in the number - the site
            // leaves both editable, so fill/select them like normal fields.
            await this.genderDropdown.selectOption(mock.gender);
            await this.dobInput.fill(mock.dob);
        } else {
            // MyKad/MyTentera/MyPr/MyKas derive DOB + Gender from the ID
            // number and render both read-only - assert, don't fill/select.
            await expect(this.dobInput).toHaveValue(mock.dob);
            await expect(this.dobInput).toBeDisabled();
            await expect(this.genderDropdown).not.toHaveValue('');
        }

        await this.phoneNumberInput.fill(mock.phone);
        await this.emailAddressInput.fill(mock.email);

        await this.subscribePlanLabel.click();
        await this.privacyPolicyLabel.click();
    }

    async clickNext() {
        await expect(this.nextButton).toBeEnabled();
        await this.nextButton.click();
    }
}