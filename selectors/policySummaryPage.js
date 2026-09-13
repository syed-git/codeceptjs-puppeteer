import { button, keyValue, layout } from './common.js';

/** Wizard step 8 - "Policy Summary" (shown right after issuing). */
export const policySummaryPage = {
  pageHeading: '//div[contains(@class,"summary-hero")]',
  nextHeading: layout.transactionHistoryHeading,
  statusHeading: '//div[contains(@class,"summary-hero")]/h2',
  policyNumber: '//div[contains(@class,"summary-policy-num")]',
  keyValue,
  viewPolicyButton: button('View Policy'),
};
