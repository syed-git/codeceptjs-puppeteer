import BasePage from './BasePage.js';
import { policyInfoPage } from '../selectors/index.js';
import { log } from '../support/logger.js';
import { isTruthy, matchOption, GENDER_OPTIONS } from '../support/normalizers.js';

/** Wizard step 1 - effective date and named insureds (data.Insured.NamedInsured<n>). */
export default class PolicyInfoPage extends BasePage {
  static pageName = 'Policy Info';

  get pageHeading() {
    return policyInfoPage.pageHeading;
  }

  async fillOutPage(data, ctx = {}) {
    await this.waitForPage();
    if (data.effectiveDate && ctx.flowName !== 'Policy Change') {
      await this.setEffectiveDate(data.effectiveDate);
    }
    const count = Number(data.numberOfInsured) || Object.keys(data.Insured || {}).length;
    for (let i = 1; i <= count; i++) {
      const insured = data.Insured?.[`NamedInsured${i}`];
      if (!insured) throw new Error(`[${this.pageName}] Insured.NamedInsured${i} is missing from the test data`);
      await this.addInsured(insured);
    }
  }

  async clickOnNext() {
    await this.clickAndExpectNextPage(policyInfoPage.nextButton, policyInfoPage.nextHeading, 'Drivers');
  }

  async setEffectiveDate(date) {
    await this.ui.fillDateField(policyInfoPage.effectiveDateInput, date);
    log.info(`effective date set to ${date}`);
  }

  async grabExpirationDate() {
    return this.ui.grabValueFrom(policyInfoPage.expirationDateInput);
  }

  /** Adds the insured unless a card with the same name already exists (policy change re-runs). */
  async addInsured(insured) {
    const fullName = `${insured.firstName} ${insured.lastName}`;
    if (await this.ui.isElementVisible(policyInfoPage.insuredCard(fullName), 500)) {
      log.info(`insured '${fullName}' already on the policy, skipping`);
      return;
    }
    await this.ui.click(policyInfoPage.addInsuredButton);
    await this.fillInsuredForm(insured);
    await this.ui.click(policyInfoPage.saveInsuredButton);
    await this.verify.validateElementPresent(policyInfoPage.insuredCard(fullName), `insured '${fullName}' was not saved`);
    log.info(`insured '${fullName}' added`);
  }

  async editInsured(fullName, changes) {
    await this.ui.click(policyInfoPage.editButton(fullName));
    await this.fillInsuredForm(changes);
    await this.ui.click(policyInfoPage.saveInsuredButton);
  }

  async removeInsured(fullName) {
    await this.ui.click(policyInfoPage.removeButton(fullName));
    await this.ui.waitForElementHidden(policyInfoPage.insuredCard(fullName));
    log.info(`insured '${fullName}' removed`);
  }

  async makePrimary(fullName) {
    await this.ui.click(policyInfoPage.makePrimaryButton(fullName));
  }

  /** Fills only the keys that are present in `insured` (optional fields stay untouched). */
  async fillInsuredForm(insured) {
    const s = policyInfoPage;
    if (insured.firstName !== undefined) await this.ui.fillField(s.firstNameInput, insured.firstName);
    if (insured.lastName !== undefined) await this.ui.fillField(s.lastNameInput, insured.lastName);
    if (insured.dateOfBirth !== undefined) await this.ui.fillDateField(s.dateOfBirthInput, insured.dateOfBirth);
    if (insured.gender !== undefined) await this.ui.selectRadio(s.genderRadio(matchOption(insured.gender, GENDER_OPTIONS)));
    if (insured.email !== undefined) await this.ui.fillField(s.emailInput, insured.email);
    if (insured.phone !== undefined) await this.ui.fillField(s.phoneInput, insured.phone);
    if (insured.address !== undefined) await this.ui.fillField(s.addressInput, insured.address);
    if (insured.city !== undefined) await this.ui.fillField(s.cityInput, insured.city);
    if (insured.state !== undefined) await this.ui.fillField(s.stateInput, insured.state);
    if (insured.zip !== undefined) await this.ui.fillField(s.zipInput, insured.zip);
    if (insured.isPrimaryInsured !== undefined) {
      await this.ui.setCheckbox(s.primaryInsuredCheckbox, isTruthy(insured.isPrimaryInsured));
    }
  }

  async grabInsuredCount() {
    return this.ui.grabElementCount(policyInfoPage.insuredCards);
  }
}
