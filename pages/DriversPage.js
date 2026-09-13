import BasePage from './BasePage.js';
import { driversPage } from '../selectors/index.js';
import { log } from '../support/logger.js';
import { matchOption, GENDER_OPTIONS, RELATIONSHIP_OPTIONS } from '../support/normalizers.js';

/** Wizard step 2 - drivers (data.Drivers.Driver<n>). */
export default class DriversPage extends BasePage {
  static pageName = 'Drivers';

  get pageHeading() {
    return driversPage.pageHeading;
  }

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
    await this.clickAndExpectNextPage(driversPage.nextButton, driversPage.nextHeading, 'Vehicles');
  }

  /** Adds the driver unless a card with the same name already exists (policy change re-runs). */
  async addDriver(driver) {
    const fullName = `${driver.firstName} ${driver.lastName}`;
    if (await this.ui.isElementVisible(driversPage.driverCard(fullName), 500)) {
      log.info(`driver '${fullName}' already on the policy, skipping`);
      return;
    }
    await this.ui.click(driversPage.addDriverButton);
    await this.fillDriverForm(driver);
    await this.ui.click(driversPage.saveDriverButton);
    await this.verify.validateElementPresent(driversPage.driverCard(fullName), `driver '${fullName}' was not saved`);
    log.info(`driver '${fullName}' added`);
  }

  async editDriver(fullName, changes) {
    await this.ui.click(driversPage.editButton(fullName));
    await this.fillDriverForm(changes);
    await this.ui.click(driversPage.saveDriverButton);
  }

  async removeDriver(fullName) {
    await this.ui.click(driversPage.removeButton(fullName));
    await this.ui.waitForElementHidden(driversPage.driverCard(fullName));
    log.info(`driver '${fullName}' removed`);
  }

  /** Fills only the keys that are present in `driver` (optional fields stay untouched). */
  async fillDriverForm(driver) {
    const s = driversPage;
    if (driver.firstName !== undefined) await this.ui.fillField(s.firstNameInput, driver.firstName);
    if (driver.lastName !== undefined) await this.ui.fillField(s.lastNameInput, driver.lastName);
    if (driver.dateOfBirth !== undefined) await this.ui.fillDateField(s.dateOfBirthInput, driver.dateOfBirth);
    if (driver.gender !== undefined) await this.ui.selectRadio(s.genderRadio(matchOption(driver.gender, GENDER_OPTIONS)));
    if (driver.licenseNumber !== undefined) await this.ui.fillField(s.licenseNumberInput, driver.licenseNumber);
    if (driver.licenseState !== undefined) await this.ui.fillField(s.licenseStateInput, driver.licenseState);
    if (driver.yearsLicensed !== undefined) await this.ui.fillField(s.yearsLicensedInput, driver.yearsLicensed);
    if (driver.accidents !== undefined) await this.ui.fillField(s.accidentsInput, driver.accidents);
    if (driver.violations !== undefined) await this.ui.fillField(s.violationsInput, driver.violations);
    if (driver.relationshipToInsured !== undefined) {
      await this.ui.selectOption(s.relationshipSelect, matchOption(driver.relationshipToInsured, RELATIONSHIP_OPTIONS));
    }
    if (driver.licenseFile) await this.ui.uploadFile(s.licenseFileInput, driver.licenseFile);
  }

  async grabDriverCount() {
    return this.ui.grabElementCount(driversPage.driverCards);
  }
}
