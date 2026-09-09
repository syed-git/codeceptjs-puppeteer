import BasePage from './BasePage.js';
import { GlobalData } from '../support/GlobalData.js';
import { log } from '../support/logger.js';
import { matchOption, OWNERSHIP_OPTIONS, USAGE_OPTIONS } from '../support/normalizers.js';

export default class VehiclesPage extends BasePage {
  static pageName = 'Vehicles';

  addVehicleButton = this.button('Add Vehicle');
  vehicleCards = '//div[contains(@class,"person-card")]';
  vehicleCard = (vin) => `//div[contains(@class,"person-card")][.//span[contains(normalize-space(), "VIN ${vin}")]]`;
  editButton = (vin) => `${this.vehicleCard(vin)}//button[not(contains(@class,"danger"))]`;
  removeButton = (vin) => `${this.vehicleCard(vin)}//button[contains(@class,"danger")]`;

  vinInput = this.fieldInput('VIN');
  yearInput = this.fieldInput('Year');
  makeInput = this.fieldInput('Make');
  modelInput = this.fieldInput('Model');
  ownershipSelect = this.fieldSelect('Ownership');
  usageSelect = this.fieldSelect('Usage');
  costNewInput = this.fieldInput('Cost New ($)');
  annualMileageInput = this.fieldInput('Annual Mileage');
  primaryDriverSelect = this.fieldSelect('Primary Driver');
  saveVehicleButton = this.button('Save Vehicle Details');
  generateQuoteButton = this.button('Generate Quote');
  nextButton = this.button('Next');

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
    await this.click(this.nextButton);
    const error = await this.grabStepError();
    if (error) throw new Error(`[${this.pageName}] ${error}`);
    await this.waitFor(this.stepHeading('Coverages'));
    GlobalData.setCurrentPage('Coverages');
  }

  /** Adds the vehicle unless one with the same VIN already exists (policy change re-runs). */
  async addVehicle(vehicle, data = {}) {
    const vin = String(vehicle.vin || '').toUpperCase();
    if (vin && (await this.isVisible(this.vehicleCard(vin), 500))) {
      log.info(`vehicle '${vin}' already on the policy, skipping`);
      return;
    }
    await this.click(this.addVehicleButton);
    await this.fillVehicleForm(vehicle, data);
    await this.click(this.saveVehicleButton);
    await this.waitFor(this.vehicleCard(vin));
    log.info(`vehicle '${vehicle.year} ${vehicle.make} ${vehicle.model}' (${vin}) added`);
  }

  async editVehicle(vin, changes, data = {}) {
    await this.click(this.editButton(vin));
    await this.fillVehicleForm(changes, data);
    await this.click(this.saveVehicleButton);
  }

  async removeVehicle(vin) {
    await this.click(this.removeButton(vin));
    await this.waitForHidden(this.vehicleCard(vin));
    log.info(`vehicle '${vin}' removed`);
  }

  async fillVehicleForm(vehicle, data = {}) {
    if (vehicle.vin !== undefined) await this.fill(this.vinInput, vehicle.vin);
    if (vehicle.year !== undefined) await this.fill(this.yearInput, vehicle.year);
    if (vehicle.make !== undefined) await this.fill(this.makeInput, vehicle.make);
    if (vehicle.model !== undefined) await this.fill(this.modelInput, vehicle.model);
    if (vehicle.ownership !== undefined) {
      await this.select(this.ownershipSelect, matchOption(vehicle.ownership, OWNERSHIP_OPTIONS));
    }
    if (vehicle.usage !== undefined) await this.select(this.usageSelect, matchOption(vehicle.usage, USAGE_OPTIONS));
    if (vehicle.costNew !== undefined) await this.fill(this.costNewInput, vehicle.costNew);
    if (vehicle.annualMileage !== undefined) await this.fill(this.annualMileageInput, vehicle.annualMileage);
    if (vehicle.primaryDriver !== undefined) {
      await this.select(this.primaryDriverSelect, this.resolvePrimaryDriver(vehicle.primaryDriver, data));
    }
  }

  /**
   * `primaryDriver` may be a driver index ("1" -> Drivers.Driver1) or a full name.
   */
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
    return this.count(this.vehicleCards);
  }

  async grabFieldError(label) {
    return this.grabText(this.fieldError(label));
  }
}
