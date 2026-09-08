import BasePage from './BasePage.js';
import { GlobalData } from '../support/GlobalData.js';
import { log } from '../support/logger.js';
import { isTruthy, matchOption, GENDER_OPTIONS } from '../support/normalizers.js';

export default class PolicyInfoPage extends BasePage {
  static pageName = 'Policy Info';

  effectiveDateInput = this.fieldInput('Effective Date');
  expirationDateInput = this.fieldInput('Expiration Date');
  addInsuredButton = this.button('Add Insured');
  insuredCards = '//div[contains(@class,"person-card")]';
  insuredCard = (fullName) => `//div[contains(@class,"person-card")][.//strong[contains(normalize-space(), "${fullName}")]]`;
  editButton = (fullName) => `${this.insuredCard(fullName)}//button[not(contains(@class,"danger"))][not(contains(., "Make Primary"))]`;
  removeButton = (fullName) => `${this.insuredCard(fullName)}//button[contains(@class,"danger")]`;
  makePrimaryButton = (fullName) => `${this.insuredCard(fullName)}//button[contains(., "Make Primary")]`;

  firstNameInput = this.fieldInput('First Name');
  lastNameInput = this.fieldInput('Last Name');
  dateOfBirthInput = this.fieldInput('Date of Birth');
  genderRadio = (gender) => this.radio(gender);
  emailInput = this.fieldInput('Email');
  phoneInput = this.fieldInput('Phone');
  addressInput = this.fieldInput('Address');
  cityInput = this.fieldInput('City');
  stateInput = this.fieldInput('State');
  zipInput = this.fieldInput('ZIP');
  primaryInsuredCheckbox = this.radio('This person is the primary insured');
  saveInsuredButton = this.button('Save Insured Details');
  cancelInsuredButton = this.button('Cancel');
  nextButton = this.button('Next');

  get pageHeading() {
    return this.stepHeading('Policy Information');
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
    await this.click(this.nextButton);
    const error = await this.grabStepError();
    if (error) throw new Error(`[${this.pageName}] ${error}`);
    await this.waitFor(this.stepHeading('Drivers'));
    GlobalData.setCurrentPage('Drivers');
  }

  async setEffectiveDate(date) {
    await this.fillDate(this.effectiveDateInput, date);
    log.info(`effective date set to ${date}`);
  }

  async grabExpirationDate() {
    return this.grabValue(this.expirationDateInput);
  }

  /** Adds the insured unless a card with the same name already exists (policy change re-runs). */
  async addInsured(insured) {
    const fullName = `${insured.firstName} ${insured.lastName}`;
    if (await this.isVisible(this.insuredCard(fullName), 500)) {
      log.info(`insured '${fullName}' already on the policy, skipping`);
      return;
    }
    await this.click(this.addInsuredButton);
    await this.fillInsuredForm(insured);
    await this.click(this.saveInsuredButton);
    await this.waitFor(this.insuredCard(fullName));
    log.info(`insured '${fullName}' added`);
  }

  async editInsured(fullName, changes) {
    await this.click(this.editButton(fullName));
    await this.fillInsuredForm(changes);
    await this.click(this.saveInsuredButton);
  }

  async removeInsured(fullName) {
    await this.click(this.removeButton(fullName));
    await this.waitForHidden(this.insuredCard(fullName));
    log.info(`insured '${fullName}' removed`);
  }

  async makePrimary(fullName) {
    await this.click(this.makePrimaryButton(fullName));
  }

  /** Fills only the keys that are present in `insured`. */
  async fillInsuredForm(insured) {
    if (insured.firstName !== undefined) await this.fill(this.firstNameInput, insured.firstName);
    if (insured.lastName !== undefined) await this.fill(this.lastNameInput, insured.lastName);
    if (insured.dateOfBirth !== undefined) await this.fillDate(this.dateOfBirthInput, insured.dateOfBirth);
    if (insured.gender !== undefined) await this.click(this.genderRadio(matchOption(insured.gender, GENDER_OPTIONS)));
    if (insured.email !== undefined) await this.fill(this.emailInput, insured.email);
    if (insured.phone !== undefined) await this.fill(this.phoneInput, insured.phone);
    if (insured.address !== undefined) await this.fill(this.addressInput, insured.address);
    if (insured.city !== undefined) await this.fill(this.cityInput, insured.city);
    if (insured.state !== undefined) await this.fill(this.stateInput, insured.state);
    if (insured.zip !== undefined) await this.fill(this.zipInput, insured.zip);
    if (insured.isPrimaryInsured !== undefined) {
      await this.setChecked(this.primaryInsuredCheckbox, isTruthy(insured.isPrimaryInsured));
    }
  }

  async grabInsuredCount() {
    return this.count(this.insuredCards);
  }

  async grabFieldError(label) {
    return this.grabText(this.fieldError(label));
  }
}
