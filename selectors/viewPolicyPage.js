import { button, keyValue, sectionHeading, layout } from './common.js';

/** Policy detail page ("View Policy") - last page of every flow. */
export const viewPolicyPage = {
  pageHeading: layout.transactionHistoryHeading,
  header: `${layout.wizardHead}/div/h1`,
  statusBadge: `${layout.wizardHead}//h1/span[contains(@class,"badge")]`,
  transactionItems: '//div[contains(@class,"timeline-item")]',
  transactionTypes: '//div[contains(@class,"timeline-item")]//strong',
  transaction: (type) => `//div[contains(@class,"timeline-item")][.//strong[normalize-space()="${type}"]]`,
  cancellationBanner: '//div[contains(@class,"cancel-banner")]',
  keyValue,
  sectionHeading,
  dashboardHeading: layout.dashboardHeading,

  backButton: button('Back'),
  policyChangeButton: button('Policy Change'),
  renewButton: button('Renew'),
  cancelPolicyButton: button('Cancel Policy'),
  reinstateButton: button('Reinstate'),
  continueSubmissionButton: button('Continue Submission'),
};
