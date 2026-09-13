import BasePage from './BasePage.js';
import { policySummaryPage } from '../selectors/index.js';
import { GlobalData } from '../support/GlobalData.js';
import { log } from '../support/logger.js';

/** Wizard step 8 - summary shown right after issuing; records policy number + status. */
export default class PolicySummaryPage extends BasePage {
  static pageName = 'Policy Summary';

  get pageHeading() {
    return policySummaryPage.pageHeading;
  }

  async fillOutPage() {
    await this.waitForPage();
    const policyNumber = await this.grabPolicyNumber();
    const status = await this.grabStatus();
    GlobalData.setPolicyNumber(policyNumber);
    GlobalData.setValue('policy.status', status);
    log.info(`policy number ${policyNumber} - ${status}`);
  }

  async clickOnNext() {
    await this.clickAndExpectNextPage(policySummaryPage.viewPolicyButton, policySummaryPage.nextHeading, 'View Policy');
  }

  async grabPolicyNumber() {
    return this.ui.grabTextFrom(policySummaryPage.policyNumber);
  }

  /** "Policy In Force" -> "In Force" */
  async grabStatus() {
    return (await this.ui.grabTextFrom(policySummaryPage.statusHeading)).replace(/^Policy\s+/, '');
  }

  async grabValueFor(key) {
    return this.ui.grabTextFrom(policySummaryPage.keyValue(key));
  }
}
