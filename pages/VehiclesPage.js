import BasePage from './BasePage.js';
import { vehiclesPage } from '../selectors/index.js';
import { log } from '../support/logger.js';
import { matchOption, OWNERSHIP_OPTIONS, USAGE_OPTIONS } from '../support/normalizers.js';

/** Wizard step 3 - vehicles (data.Vehicles.Vehicle<n>). */
export default class VehiclesPage extends BasePage {
  static pageName = 'Vehicles';

  get pageHeading() {
    return vehiclesPage.pageHeading;
  }

  async fillOutPage(data) {
    await this.waitForPage();
    const count = Number(data.numberOfVehicles) || Object.keys(data.Vehicles || {}).length;
    for (let i = 1; i <= count; i++) {
      const vehicle = data.Vehicles?.[`Vehicle${i}`];
      if (!vehicle) throw new Error(`[${this.pageName}] Vehicles.Vehicle${i} is missing from the test data`);
      await this.addVehicle(vehicle, data);
    }
  }

  async clickOnNext() {
    await this.clickAndExpectNextPage(vehiclesPage.nextButton, vehiclesPage.nextHeading, 'Coverages');
  }

  /** Adds the vehicle unless one with the same VIN already exists (policy change re-runs). */
  async addVehicle(vehicle, data = {}) {
    const vin = String(vehicle.vin || '').toUpperCase();
    if (vin && (await this.ui.isElementVisible(vehiclesPage.vehicleCard(vin), 500))) {
      log.info(`vehicle '${vin}' already on the policy, skipping`);
      return;
    }
    await this.ui.click(vehiclesPage.addVehicleButton);
    await this.fillVehicleForm(vehicle, data);
    await this.ui.click(vehiclesPage.saveVehicleButton);
    await this.verify.validateElementPresent(vehiclesPage.vehicleCard(vin), `vehicle '${vin}' was not saved`);
    log.info(`vehicle '${vehicle.year} ${vehicle.make} ${vehicle.model}' (${vin}) added`);
  }

  async editVehicle(vin, changes, data = {}) {
    await this.ui.click(vehiclesPage.editButton(vin));
    await this.fillVehicleForm(changes, data);
    await this.ui.click(vehiclesPage.saveVehicleButton);
  }

  async removeVehicle(vin) {
    await this.ui.click(vehiclesPage.removeButton(vin));
    await this.ui.waitForElementHidden(vehiclesPage.vehicleCard(vin));
    log.info(`vehicle '${vin}' removed`);
  }

  /** Fills only the keys that are present in `vehicle` (optional fields stay untouched). */
  async fillVehicleForm(vehicle, data = {}) {
    const s = vehiclesPage;
    if (vehicle.vin !== undefined) await this.ui.fillField(s.vinInput, vehicle.vin);
    if (vehicle.year !== undefined) await this.ui.fillField(s.yearInput, vehicle.year);
    if (vehicle.make !== undefined) await this.ui.fillField(s.makeInput, vehicle.make);
    if (vehicle.model !== undefined) await this.ui.fillField(s.modelInput, vehicle.model);
    if (vehicle.ownership !== undefined) {
      await this.ui.selectOption(s.ownershipSelect, matchOption(vehicle.ownership, OWNERSHIP_OPTIONS));
    }
    if (vehicle.usage !== undefined) await this.ui.selectOption(s.usageSelect, matchOption(vehicle.usage, USAGE_OPTIONS));
    if (vehicle.costNew !== undefined) await this.ui.fillField(s.costNewInput, vehicle.costNew);
    if (vehicle.annualMileage !== undefined) await this.ui.fillField(s.annualMileageInput, vehicle.annualMileage);
    if (vehicle.primaryDriver !== undefined) {
      await this.ui.selectOption(s.primaryDriverSelect, this.resolvePrimaryDriver(vehicle.primaryDriver, data));
    }
  }

  /** `primaryDriver` may be a driver index ("1" -> Drivers.Driver1) or a full name. */
  resolvePrimaryDriver(primaryDriver, data) {
    const value = String(primaryDriver).trim();
    if (/^\d+$/.test(value)) {
      const driver = data.Drivers?.[`Driver${value}`];
      if (!driver) throw new Error(`[${this.pageName}] primaryDriver "${value}" refers to Drivers.Driver${value} which is not in the test data`);
      return `${driver.firstName} ${driver.lastName}`;
    }
    return value;
  }

  async grabVehicleCount() {
    return this.ui.grabElementCount(vehiclesPage.vehicleCards);
  }
}
