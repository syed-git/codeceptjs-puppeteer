import { button, fieldInput, radio, stepHeading, card } from './common.js';

/** Wizard step 1 - "Policy Information": effective date + named insureds. */
export const policyInfoPage = {
  pageHeading: stepHeading('Policy Information'),
  nextHeading: stepHeading('Drivers'),
  effectiveDateInput: fieldInput('Effective Date'),
  expirationDateInput: fieldInput('Expiration Date'),
  addInsuredButton: button('Add Insured'),
  insuredCards: '//div[contains(@class,"person-card")]',
  insuredCard: (fullName) => card(fullName),
  editButton: (fullName) => `${card(fullName)}//button[not(contains(@class,"danger"))][not(contains(., "Make Primary"))]`,
  removeButton: (fullName) => `${card(fullName)}//button[contains(@class,"danger")]`,
  makePrimaryButton: (fullName) => `${card(fullName)}//button[contains(., "Make Primary")]`,

  // insured form
  firstNameInput: fieldInput('First Name'),
  lastNameInput: fieldInput('Last Name'),
  dateOfBirthInput: fieldInput('Date of Birth'),
  genderRadio: (gender) => radio(gender),
  emailInput: fieldInput('Email'),
  phoneInput: fieldInput('Phone'),
  addressInput: fieldInput('Address'),
  cityInput: fieldInput('City'),
  stateInput: fieldInput('State'),
  zipInput: fieldInput('ZIP'),
  primaryInsuredCheckbox: radio('This person is the primary insured'),
  saveInsuredButton: button('Save Insured Details'),
  cancelInsuredButton: button('Cancel'),
  nextButton: button('Next'),
};
