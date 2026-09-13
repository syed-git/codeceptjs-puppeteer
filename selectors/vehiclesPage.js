import { button, fieldInput, fieldSelect, stepHeading, card } from './common.js';

/** Wizard step 3 - "Vehicles". */
export const vehiclesPage = {
  pageHeading: stepHeading('Vehicles'),
  nextHeading: stepHeading('Coverages'),
  addVehicleButton: button('Add Vehicle'),
  vehicleCards: '//div[contains(@class,"person-card")]',
  vehicleCard: (vin) => card(`VIN ${vin}`),
  editButton: (vin) => `${card(`VIN ${vin}`)}//button[not(contains(@class,"danger"))]`,
  removeButton: (vin) => `${card(`VIN ${vin}`)}//button[contains(@class,"danger")]`,

  // vehicle form
  vinInput: fieldInput('VIN'),
  yearInput: fieldInput('Year'),
  makeInput: fieldInput('Make'),
  modelInput: fieldInput('Model'),
  ownershipSelect: fieldSelect('Ownership'),
  usageSelect: fieldSelect('Usage'),
  costNewInput: fieldInput('Cost New ($)'),
  annualMileageInput: fieldInput('Annual Mileage'),
  primaryDriverSelect: fieldSelect('Primary Driver'),
  saveVehicleButton: button('Save Vehicle Details'),
  nextButton: button('Next'),
};
