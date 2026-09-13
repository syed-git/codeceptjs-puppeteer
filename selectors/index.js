/**
 * Page-wise locators. One file per page, plus common.js for the shared builders.
 *
 *   import { driversPage } from '../selectors/index.js';
 *   await this.ui.click(driversPage.addDriverButton);
 */
export * from './common.js';
export { loginPage } from './loginPage.js';
export { homePage } from './homePage.js';
export { policyInfoPage } from './policyInfoPage.js';
export { driversPage } from './driversPage.js';
export { vehiclesPage } from './vehiclesPage.js';
export { coveragesPage } from './coveragesPage.js';
export { quotePage } from './quotePage.js';
export { riskAnalysisPage } from './riskAnalysisPage.js';
export { reviewPage } from './reviewPage.js';
export { policySummaryPage } from './policySummaryPage.js';
export { viewPolicyPage } from './viewPolicyPage.js';
export { cancelPolicyPage } from './cancelPolicyPage.js';
