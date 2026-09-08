import BasePage from './BasePage.js';
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

  newSubmissionButton = this.button('New Submission');
  searchInput = '//input[starts-with(@placeholder, "Search by policy number")]';
  policyRow = (policyNumber) => `//div[contains(@class,"table-row")][.//span[contains(@class,"policy-num")][contains(normalize-space(), "${policyNumber}")]]`;
  statusChip = (status) => `//button[contains(@class,"chip")][normalize-space()="${status}"]`;
  noPoliciesMessage = '//h3[normalize-space()="No policies found"]';

  // policy detail
  policyChangeButton = this.button('Policy Change');
  cancelPolicyButton = this.button('Cancel Policy');
  continueSubmissionButton = this.button('Continue Submission');
  changeEffectiveDateInput = this.fieldInput('Change Effective Date');
  changeContinueButton = this.button('Continue');
  policyInfoHeading = this.stepHeading('Policy Information');
  cancelModalHeading = '//h2[starts-with(normalize-space(), "Cancel Policy")]';

  get pageHeading() {
    return this.dashboardHeading;
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
        await this.click(this.cancelPolicyButton);
        await this.waitFor(this.cancelModalHeading);
        break;
      default:
        await this.startNewSubmission();
    }
  }

  async startNewSubmission() {
    await this.click(this.newSubmissionButton);
    await this.waitFor(this.policyInfoHeading);
    GlobalData.setCurrentPage('Policy Info');
    log.info('new submission initiated');
  }

  /** Searches the dashboard for a policy / submission number and opens it. */
  async openPolicy(policyNumber) {
    await this.waitForPage();
    await this.fill(this.searchInput, policyNumber);
    await this.waitFor(this.policyRow(policyNumber));
    await this.click(this.policyRow(policyNumber));
    // policy detail shows the number in the <h1>, the wizard (UW Review/Approved/Rejected) in the sub-heading
    await this.waitFor(`//*[self::h1 or self::p][contains(normalize-space(), "${policyNumber}")]`);
    log.info(`opened policy ${policyNumber}`);
  }

  /** Whether opening the policy landed in the wizard (UW Review/Approved/Rejected) or on the detail page. */
  async isOnPolicyDetail() {
    return this.isVisible('//h3[contains(normalize-space(), "Transaction History")]', 1500);
  }

  async startPolicyChange(effectiveDate) {
    await this.click(this.policyChangeButton);
    await this.waitFor(this.changeEffectiveDateInput);
    await this.fillDate(this.changeEffectiveDateInput, effectiveDate || relativeDate(1));
    await this.click(this.changeContinueButton);
    await this.waitFor(this.policyInfoHeading);
    GlobalData.setCurrentPage('Policy Info');
    log.info(`policy change initiated effective ${effectiveDate || relativeDate(1)}`);
  }

  async grabPolicyStatus(policyNumber) {
    await this.fill(this.searchInput, policyNumber);
    await this.waitFor(this.policyRow(policyNumber));
    return this.grabText(`${this.policyRow(policyNumber)}//span[contains(@class,"badge")]`);
  }
}
