import path from 'path';
import BasePage from './BasePage.js';
import { GlobalData } from '../support/GlobalData.js';
import { log } from '../support/logger.js';
import { matchOption, GENDER_OPTIONS, RELATIONSHIP_OPTIONS } from '../support/normalizers.js';

export default class DriversPage extends BasePage {
  static pageName = 'Drivers';

  addDriverButton = this.button('Add Driver');
  driverCards = '//div[contains(@class,"person-card")]';
  driverCard = (fullName) => `//div[contains(@class,"person-card")][.//strong[contains(normalize-space(), "${fullName}")]]`;
  editButton = (fullName) => `${this.driverCard(fullName)}//button[not(contains(@class,"danger"))]`;
  removeButton = (fullName) => `${this.driverCard(fullName)}//button[contains(@class,"danger")]`;

  firstNameInput = this.fieldInput('First Name');
  lastNameInput = this.fieldInput('Last Name');
  dateOfBirthInput = this.fieldInput('Date of Birth');
  genderRadio = (gender) => this.radio(gender);
  licenseNumberInput = this.fieldInput('License Number');
  licenseStateInput = this.fieldInput('License State');
  yearsLicensedInput = this.fieldInput('Years Licensed');
  accidentsInput = this.fieldInput('Accidents (past 5 yrs)');
  violationsInput = this.fieldInput('Violations (past 5 yrs)');
  relationshipSelect = this.fieldSelect('Relationship to Insured');
  licenseFileInput = this.fieldInput("Driver's License (PDF, max 5 MB)");
  saveDriverButton = this.button('Save Driver Details');
  nextButton = this.button('Next');

  async fillOutPage(data) {
    await this.waitForPage();
    const count = Number(data.numberOfDrivers) || Object.keys(data.Drivers || {}).length;
    for (let i = 1; i <= count; i++) {
      const driver = data.Drivers?.[`Driver${i}`];
      if (!driver) throw new Error(`[${this.pageName}] Drivers.Driver${i} is missing from the test data`);
      await this.addDriver(driver);
    }
  }

  async clickOnNext() {
    await this.click(this.nextButton);
    const error = await this.grabStepError();
    if (error) throw new Error(`[${this.pageName}] ${error}`);
    await this.waitFor(this.stepHeading('Vehicles'));
    GlobalData.setCurrentPage('Vehicles');
  }

  /** Adds the driver unless a card with the same name already exists (policy change re-runs). */
  async addDriver(driver) {
    const fullName = `${driver.firstName} ${driver.lastName}`;
    if (await this.isVisible(this.driverCard(fullName), 500)) {
      log.info(`driver '${fullName}' already on the policy, skipping`);
      return;
    }
    await this.click(this.addDriverButton);
    await this.fillDriverForm(driver);
    await this.click(this.saveDriverButton);
    await this.waitFor(this.driverCard(fullName));
    log.info(`driver '${fullName}' added`);
  }

  async editDriver(fullName, changes) {
    await this.click(this.editButton(fullName));
    await this.fillDriverForm(changes);
    await this.click(this.saveDriverButton);
  }

  async removeDriver(fullName) {
    await this.click(this.removeButton(fullName));
    await this.waitForHidden(this.driverCard(fullName));
    log.info(`driver '${fullName}' removed`);
  }

  async fillDriverForm(driver) {
    if (driver.firstName !== undefined) await this.fill(this.firstNameInput, driver.firstName);
    if (driver.lastName !== undefined) await this.fill(this.lastNameInput, driver.lastName);
    if (driver.dateOfBirth !== undefined) await this.fillDate(this.dateOfBirthInput, driver.dateOfBirth);
    if (driver.gender !== undefined) await this.click(this.genderRadio(matchOption(driver.gender, GENDER_OPTIONS)));
    if (driver.licenseNumber !== undefined) await this.fill(this.licenseNumberInput, driver.licenseNumber);
    if (driver.licenseState !== undefined) await this.fill(this.licenseStateInput, driver.licenseState);
    if (driver.yearsLicensed !== undefined) await this.fill(this.yearsLicensedInput, driver.yearsLicensed);
    if (driver.accidents !== undefined) await this.fill(this.accidentsInput, driver.accidents);
    if (driver.violations !== undefined) await this.fill(this.violationsInput, driver.violations);
    if (driver.relationshipToInsured !== undefined) {
      await this.select(this.relationshipSelect, matchOption(driver.relationshipToInsured, RELATIONSHIP_OPTIONS));
    }
    if (driver.licenseFile) await this.uploadLicense(driver.licenseFile);
  }

  async uploadLicense(filePath) {
    const input = await this.waitFor(this.licenseFileInput, { visible: false });
    await input.uploadFile(path.resolve(filePath));
    await this.settle(500);
  }

  async grabDriverCount() {
    return this.count(this.driverCards);
  }

  async grabFieldError(label) {
    return this.grabText(this.fieldError(label));
  }
}
