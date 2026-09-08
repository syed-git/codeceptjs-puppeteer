import BasePage from './BasePage.js';
import { GlobalData } from '../support/GlobalData.js';
import { log } from '../support/logger.js';

/**
 * Policy detail page ("View Policy"). Terminal page of every flow; also the
 * entry point for Policy Change, Cancellation, Renewal and Reinstatement.
 */
export default class ViewPolicyPage extends BasePage {
  static pageName = 'View Policy';

  header = '//div[contains(@class,"wizard-head")]/div/h1';
  statusBadge = '//div[contains(@class,"wizard-head")]//h1/span[contains(@class,"badge")]';
  transactionHistory = '//h3[contains(normalize-space(), "Transaction History")]';
  transactionItems = '//div[contains(@class,"timeline-item")]';
  transaction = (type) => `//div[contains(@class,"timeline-item")][.//strong[normalize-space()="${type}"]]`;
  cancellationBanner = '//div[contains(@class,"cancel-banner")]';
  keyValue = (key) => `//div[contains(@class,"kv")][span[contains(@class,"kv-key")][starts-with(normalize-space(), "${key}")]]/span[contains(@class,"kv-val")]`;
  sectionHeading = (title) => `//div[contains(@class,"card")]/h3[starts-with(normalize-space(), "${title}")]`;

  backButton = this.button('Back');
  policyChangeButton = this.button('Policy Change');
  renewButton = this.button('Renew');
  cancelPolicyButton = this.button('Cancel Policy');
  reinstateButton = this.button('Reinstate');
  continueSubmissionButton = this.button('Continue Submission');

  get pageHeading() {
    return this.transactionHistory;
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
  async clickOnNext() {
    GlobalData.setCurrentPage('View Policy');
  }

  async grabPolicyNumber() {
    const text = await this.grabText(this.header);
    return text.match(/PA-\d+/)?.[0] || text.split(/\s+/)[0];
  }

  async grabStatus() {
    return this.grabText(this.statusBadge);
  }

  async grabValueFor(key) {
    return this.grabText(this.keyValue(key));
  }

  async grabSectionCount(title) {
    const text = await this.grabText(this.sectionHeading(title));
    return Number(text.match(/\((\d+)\)/)?.[1] ?? 0);
  }

  async grabTransactionTypes() {
    const items = await this.findAll(`${this.transactionItems}//strong`);
    return Promise.all(items.map((i) => i.evaluate((el) => el.innerText.trim())));
  }

  async hasTransaction(type) {
    return this.isVisible(this.transaction(type), 1000);
  }

  async grabCancellationBanner() {
    return this.grabText(this.cancellationBanner);
  }

  async renewPolicy() {
    await this.click(this.renewButton);
    await this.waitFor(this.transaction('Renewal'));
    log.info('policy renewed');
  }

  async reinstatePolicy() {
    await this.click(this.reinstateButton);
    await this.waitFor(this.cancelPolicyButton);
    GlobalData.setValue('policy.status', await this.grabStatus());
    log.info('policy reinstated');
  }

  async backToHome() {
    await this.click(this.backButton);
    await this.waitFor('//h1[normalize-space()="Policies"]');
    GlobalData.setCurrentPage('Home Page');
  }
}
