import { button, fieldInput, fieldSelect, radio, stepHeading, card } from './common.js';

/** Wizard step 2 - "Drivers". */
export const driversPage = {
  pageHeading: stepHeading('Drivers'),
  nextHeading: stepHeading('Vehicles'),
  addDriverButton: button('Add Driver'),
  driverCards: '//div[contains(@class,"person-card")]',
  driverCard: (fullName) => card(fullName),
  editButton: (fullName) => `${card(fullName)}//button[not(contains(@class,"danger"))]`,
  removeButton: (fullName) => `${card(fullName)}//button[contains(@class,"danger")]`,

  // driver form
  firstNameInput: fieldInput('First Name'),
  lastNameInput: fieldInput('Last Name'),
  dateOfBirthInput: fieldInput('Date of Birth'),
  genderRadio: (gender) => radio(gender),
  licenseNumberInput: fieldInput('License Number'),
  licenseStateInput: fieldInput('License State'),
  yearsLicensedInput: fieldInput('Years Licensed'),
  accidentsInput: fieldInput('Accidents (past 5 yrs)'),
  violationsInput: fieldInput('Violations (past 5 yrs)'),
  relationshipSelect: fieldSelect('Relationship to Insured'),
  licenseFileInput: fieldInput("Driver's License (PDF, max 5 MB)"),
  saveDriverButton: button('Save Driver Details'),
  nextButton: button('Next'),
};
