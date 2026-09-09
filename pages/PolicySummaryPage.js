import BasePage from './BasePage.js';
import { GlobalData } from '../support/GlobalData.js';
import { log } from '../support/logger.js';

export default class PolicySummaryPage extends BasePage {
  static pageName = 'Policy Summary';

  summaryHero = '//div[contains(@class,"summary-hero")]';
  statusHeading = '//div[contains(@class,"summary-hero")]/h2';
  policyNumber = '//div[contains(@class,"summary-policy-num")]';
  keyValue = (key) => `//div[contains(@class,"kv")][span[contains(@class,"kv-key")][starts-with(normalize-space(), "${key}")]]/span[contains(@class,"kv-val")]`;
  viewPolicyButton = this.button('View Policy');

  get pageHeading() {
    return this.summaryHero;
  }

  async fillOutPage() {
    await this.waitForPage();
    const policyNumber = await this.grabPolicyNumber();
    GlobalData.setPolicyNumber(policyNumber);
    GlobalData.setValue('policy.status', await this.grabStatus());
    log.info(`policy number ${policyNumber} - ${await this.grabStatus()}`);
  }

  async clickOnNext() {
    await this.click(this.viewPolicyButton);
    await this.waitFor('//h3[contains(normalize-space(), "Transaction History")]');
    GlobalData.setCurrentPage('View Policy');
  }

  async grabPolicyNumber() {
    return this.grabText(this.policyNumber);
  }

  /** "Policy In Force" -> "In Force" */
  async grabStatus() {
    return (await this.grabText(this.statusHeading)).replace(/^Policy\s+/, '');
  }

  async grabValueFor(key) {
    return this.grabText(this.keyValue(key));
  }
}
