import { button, fieldInput, stepHeading, layout } from './common.js';

const policyRow = (policyNumber) =>
  `//div[contains(@class,"table-row")][.//span[contains(@class,"policy-num")][contains(normalize-space(), "${policyNumber}")]]`;

/** Dashboard ("Policies") + the policy detail actions used to start a flow. */
export const homePage = {
  pageHeading: layout.dashboardHeading,
  newSubmissionButton: button('New Submission'),
  searchInput: '//input[starts-with(@placeholder, "Search by policy number")]',
  policyRow,
  policyRowStatus: (policyNumber) => `${policyRow(policyNumber)}//span[contains(@class,"badge")]`,
  statusChip: (status) => `//button[contains(@class,"chip")][normalize-space()="${status}"]`,
  noPoliciesMessage: '//h3[normalize-space()="No policies found"]',
  /** Policy detail (h1) or wizard sub-heading (p) that shows the opened transaction number. */
  openedTransactionHeading: (number) => `//*[self::h1 or self::p][contains(normalize-space(), "${number}")]`,

  // policy detail actions
  policyChangeButton: button('Policy Change'),
  cancelPolicyButton: button('Cancel Policy'),
  continueSubmissionButton: button('Continue Submission'),
  changeEffectiveDateInput: fieldInput('Change Effective Date'),
  changeContinueButton: button('Continue'),
  policyInfoHeading: stepHeading('Policy Information'),
  cancelModalHeading: '//h2[starts-with(normalize-space(), "Cancel Policy")]',
  transactionHistoryHeading: layout.transactionHistoryHeading,
};
