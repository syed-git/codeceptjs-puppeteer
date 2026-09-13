import BasePage from './BasePage.js';
import { viewPolicyPage } from '../selectors/index.js';
import { GlobalData } from '../support/GlobalData.js';
import { log } from '../support/logger.js';

/**
 * Policy detail page ("View Policy"). Terminal page of every flow; also the
 * entry point for Policy Change, Cancellation, Renewal and Reinstatement.
 */
export default class ViewPolicyPage extends BasePage {
  static pageName = 'View Policy';

  get pageHeading() {
    return viewPolicyPage.pageHeading;
  }

  async fillOutPage() {
    await this.waitForPage();
    const policyNumber = await this.grabPolicyNumber();
    const status = await this.grabStatus();
    GlobalData.setPolicyNumber(policyNumber);
    GlobalData.setValue('policy.status', status);
    log.info(`viewing policy ${policyNumber} - ${status}`);
  }

  /** Last page of the flow: nothing to continue to. */
  async clickOnNext() {}

  async grabPolicyNumber() {
    const text = await this.ui.grabTextFrom(viewPolicyPage.header);
    return text.match(/PA-\d+/)?.[0] || text.split(/\s+/)[0];
  }

  async grabStatus() {
    return this.ui.grabTextFrom(viewPolicyPage.statusBadge);
  }

  async grabValueFor(key) {
    return this.ui.grabTextFrom(viewPolicyPage.keyValue(key));
  }

  /** "Drivers (2)" -> 2 */
  async grabSectionCount(title) {
    const text = await this.ui.grabTextFrom(viewPolicyPage.sectionHeading(title));
    return Number(text.match(/\((\d+)\)/)?.[1] ?? 0);
  }

  async grabTransactionTypes() {
    return this.ui.grabTextsFrom(viewPolicyPage.transactionTypes);
  }

  async hasTransaction(type) {
    return this.ui.isElementVisible(viewPolicyPage.transaction(type), 1000);
  }

  async grabCancellationBanner() {
    return this.ui.grabTextFrom(viewPolicyPage.cancellationBanner);
  }

  async renewPolicy() {
    await this.ui.click(viewPolicyPage.renewButton);
    await this.verify.validateElementPresent(viewPolicyPage.transaction('Renewal'), 'renewal not listed in the transaction history');
    log.info('policy renewed');
  }

  async reinstatePolicy() {
    await this.ui.click(viewPolicyPage.reinstateButton);
    await this.ui.waitForElement(viewPolicyPage.cancelPolicyButton);
    GlobalData.setValue('policy.status', await this.grabStatus());
    log.info('policy reinstated');
  }

  async backToHome() {
    await this.ui.click(viewPolicyPage.backButton);
    await this.ui.waitForElement(viewPolicyPage.dashboardHeading);
  }
}
