import BasePage from './BasePage.js';
import { homePage } from '../selectors/index.js';
import { GlobalData } from '../support/GlobalData.js';
import { log } from '../support/logger.js';
import { relativeDate } from '../support/dates.js';

/**
 * Dashboard ("Policies"). First page of every flow:
 *   New Submission -> clicks "New Submission"
 *   Policy Change  -> opens the policy, clicks "Policy Change", sets the change date
 *   Cancellation   -> opens the policy, clicks "Cancel Policy"
 */
export default class HomePage extends BasePage {
  static pageName = 'Home Page';

  get pageHeading() {
    return homePage.pageHeading;
  }

  async fillOutPage(data, ctx = {}) {
    await this.goToDashboard();
    await this.waitForPage();
    if (ctx.flowName === 'New Submission') return;
    const policyNumber = ctx.policyNumber || GlobalData.getPolicyNumber();
    if (!policyNumber) {
      throw new Error(`[${this.pageName}] A policy number is required to start '${ctx.flowName}'. Run 'New Submission' first or pass { policyNumber }.`);
    }
    await this.openPolicy(policyNumber);
  }

  async clickOnNext(ctx = {}) {
    switch (ctx.flowName) {
      case 'Policy Change':
        await this.startPolicyChange(ctx.changeEffectiveDate || GlobalData.getValue('effectiveDate'));
        break;
      case 'Cancellation':
        await this.ui.click(homePage.cancelPolicyButton);
        await this.ui.waitForElement(homePage.cancelModalHeading);
        break;
      default:
        await this.startNewSubmission();
    }
  }

  async startNewSubmission() {
    await this.ui.click(homePage.newSubmissionButton);
    await this.ui.waitForElement(homePage.policyInfoHeading);
    log.info('new submission initiated');
  }

  /** Searches the dashboard for a policy / submission number and opens it. */
  async openPolicy(policyNumber) {
    await this.waitForPage();
    await this.ui.fillField(homePage.searchInput, policyNumber);
    await this.verify.validateElementPresent(homePage.policyRow(policyNumber), `transaction ${policyNumber} not found on the dashboard`);
    await this.ui.click(homePage.policyRow(policyNumber));
    await this.ui.waitForElement(homePage.openedTransactionHeading(policyNumber));
    log.info(`opened ${policyNumber}`);
  }

  /** Whether opening the policy landed on the detail page (vs. the wizard for UW Review/Approved/Rejected). */
  async isOnPolicyDetail() {
    return this.ui.isElementVisible(homePage.transactionHistoryHeading, 1500);
  }

  async startPolicyChange(effectiveDate) {
    const date = effectiveDate || relativeDate(1);
    await this.ui.click(homePage.policyChangeButton);
    await this.ui.fillDateField(homePage.changeEffectiveDateInput, date);
    await this.ui.click(homePage.changeContinueButton);
    await this.ui.waitForElement(homePage.policyInfoHeading);
    log.info(`policy change initiated effective ${date}`);
  }

  async grabPolicyStatus(policyNumber) {
    await this.ui.fillField(homePage.searchInput, policyNumber);
    return this.ui.grabTextFrom(homePage.policyRowStatus(policyNumber));
  }
}
