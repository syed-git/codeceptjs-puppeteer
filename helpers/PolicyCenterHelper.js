import Helper from '@codeceptjs/helper';
import { FLOWS, resolveFlowName, resolvePageName } from '../flows/flows.js';
import { getPageClass, LoginPage, HomePage, RiskAnalysisPage } from '../pages/index.js';
import { GlobalData } from '../support/GlobalData.js';
import { log } from '../support/logger.js';

const ROLE_ALIASES = {
  accountexecutive: 'accountExecutive',
  ae: 'accountExecutive',
  aexec: 'accountExecutive',
  underwriter: 'underwriter',
  uw: 'underwriter',
  uwriter: 'underwriter',
};

/**
 * Flow-level actions exposed on `I`:
 *
 *   await I.loginAs('accountExecutive');
 *   await I.executeFlow('New Submission');            // Home Page -> ... -> View Policy
 *   await I.createFlow('Policy Change');              // Home Page step only, lands on Policy Info
 *   await I.navigateTo('Drivers');                    // fills every page before Drivers, lands on Drivers
 *   await I.fillOutCurrentPage();                     // fills Drivers, stays
 *   await I.finishFlow();                             // fills the remaining pages to the end
 *
 * Pages are driven through the page classes in ./pages, which locate elements with Puppeteer.
 */
class PolicyCenterHelper extends Helper {
  constructor(config) {
    super(config);
    this.environment = config.environment;
    this._resetState();
  }

  _before() {
    GlobalData.clear();
    this._resetState();
  }

  _resetState() {
    this.flowName = null;
    this.pageIndex = 0;
    this.flowOptions = {};
    this.currentRole = null;
  }

  /* ------------------------------------------------------------------ */
  /* Internals                                                            */
  /* ------------------------------------------------------------------ */

  get puppeteer() {
    return this.helpers.Puppeteer;
  }

  get page() {
    const { page } = this.puppeteer;
    if (!page) throw new Error('Browser page is not available yet. Is the Puppeteer helper enabled?');
    return page;
  }

  get flowPages() {
    if (!this.flowName) {
      throw new Error("No active flow. Call I.createFlow('New Submission') or I.executeFlow(...) first.");
    }
    return FLOWS[this.flowName];
  }

  get ctx() {
    return {
      flowName: this.flowName,
      role: this.currentRole,
      environment: this.environment,
      ...this.flowOptions,
    };
  }

  _pageObject(pageName) {
    const PageClass = getPageClass(pageName);
    return new PageClass(this.page, this.puppeteer.options.waitForTimeout);
  }

  _setPageIndex(index) {
    this.pageIndex = index;
    GlobalData.setCurrentPage(this.flowPages[index] || '');
  }

  _resolveRole(role) {
    const key = ROLE_ALIASES[String(role).replace(/[\s_-]/g, '').toLowerCase()];
    const user = key && this.environment.users?.[key];
    if (!user) {
      throw new Error(`Unknown role "${role}". Configured roles: ${Object.keys(this.environment.users || {}).join(', ')}`);
    }
    return { key, ...user };
  }

  _data() {
    return GlobalData.getData();
  }

  /** Runs one page of the active flow: wait -> fill -> (UW approval) -> continue. */
  async _runPage(index, { fill = true, continueToNext = true } = {}) {
    const pageName = this.flowPages[index];
    const pageObj = this._pageObject(pageName);
    log.section(`${this.flowName} › ${pageName}`);

    if (fill) await pageObj.fillOutPage(this._data(), this.ctx);
    else await pageObj.waitForPage();

    if (
      pageObj instanceof RiskAnalysisPage &&
      this.flowOptions.autoApproveUnderwritingIssues !== false &&
      this.currentRole !== 'underwriter' &&
      (await pageObj.needsUnderwriterApproval())
    ) {
      await this.approveUnderwritingIssues();
    }

    await this._captureTransactionNumber(pageObj);
    if (!continueToNext) return;

    await pageObj.clickOnNext(this.ctx);
    this._setPageIndex(Math.min(index + 1, this.flowPages.length - 1));
  }

  async _captureTransactionNumber(pageObj) {
    const number = await pageObj.grabTransactionNumber();
    if (number && !GlobalData.getSubmissionNumber()) GlobalData.setSubmissionNumber(number);
  }

  _destinationIndex(destination) {
    const pageName = resolvePageName(this.flowName, destination);
    const index = this.flowPages.indexOf(pageName);
    if (index < this.pageIndex) {
      throw new Error(
        `Cannot navigate backwards from '${this.flowPages[this.pageIndex]}' to '${pageName}'. Flow order: ${this.flowPages.join(' -> ')}`,
      );
    }
    return index;
  }

  /* ------------------------------------------------------------------ */
  /* Authentication                                                       */
  /* ------------------------------------------------------------------ */

  /**
   * Logs in as a configured role from config/env/<ENV>.json.
   *   await I.loginAs('accountExecutive');   // or 'underwriter', 'AE', 'UW'
   */
  async loginAs(role = 'accountExecutive') {
    const user = this._resolveRole(role);
    const loginPage = new LoginPage(this.page);
    if (!(await loginPage.isVisible(loginPage.pageHeading, 1000))) {
      await this.puppeteer.amOnPage('/');
    }
    await loginPage.login(user.username, user.password);
    this.currentRole = user.key;
  }

  async logout() {
    const loginPage = new LoginPage(this.page);
    await loginPage.logout();
    this.currentRole = null;
  }

  /* ------------------------------------------------------------------ */
  /* Flow API                                                             */
  /* ------------------------------------------------------------------ */

  /**
   * Runs the whole flow: every page's fillOutPageAndContinue in order.
   *   await I.executeFlow('New Submission');
   *   await I.executeFlow('Cancellation', { policyNumber: 'PA-100234' });
   */
  async executeFlow(flowName, options = {}) {
    await this.createFlow(flowName, options);
    await this.finishFlow();
  }

  /**
   * Starts the flow (Home Page step only) and leaves the user on the first wizard page.
   * Options:
   *   policyNumber                  - policy to open for Policy Change / Cancellation (defaults to the last issued one)
   *   changeEffectiveDate           - Policy Change effective date (defaults to data.effectiveDate)
   *   autoApproveUnderwritingIssues - run the underwriter approval round-trip when blocked (default true)
   */
  async createFlow(flowName, options = {}) {
    if (!this.currentRole) throw new Error("Nobody is logged in. Call I.loginAs('accountExecutive') first.");
    this.flowName = resolveFlowName(flowName);
    this.flowOptions = options;
    GlobalData.setCurrentFlow(this.flowName);
    this._setPageIndex(0);
    log.section(`Starting flow '${this.flowName}': ${this.flowPages.join(' -> ')}`);
    await this._runPage(0);
  }

  /** Fills out every remaining page of the active flow, including the last one. */
  async finishFlow() {
    const last = this.flowPages.length - 1;
    while (this.pageIndex < last) {
      await this._runPage(this.pageIndex);
    }
    await this._runPage(last, { continueToNext: false });
    log.section(`Flow '${this.flowName}' finished`);
  }

  /**
   * Navigator: fills out every page before `destination` and lands on it (destination is not filled).
   *   await I.navigateTo('Coverages');
   */
  async navigateTo(destination) {
    const target = this._destinationIndex(destination);
    while (this.pageIndex < target) {
      await this._runPage(this.pageIndex);
    }
    await this._pageObject(this.flowPages[this.pageIndex]).waitForPage();
  }

  /** Clicks through to `destination` without filling anything (pages already hold data, e.g. Policy Change). */
  async clickNextTo(destination) {
    const target = this._destinationIndex(destination);
    while (this.pageIndex < target) {
      await this._runPage(this.pageIndex, { fill: false });
    }
    await this._pageObject(this.flowPages[this.pageIndex]).waitForPage();
  }

  /** Fills the current page and stays on it. */
  async fillOutCurrentPage() {
    await this._runPage(this.pageIndex, { continueToNext: false });
  }

  /** Fills the current page and moves to the next one. */
  async fillOutPageAndContinue() {
    await this._runPage(this.pageIndex);
  }

  /** Clicks the current page's Next/Continue button without filling. */
  async clickOnNext() {
    await this._runPage(this.pageIndex, { fill: false });
  }

  /**
   * Underwriter approval round-trip for blocking underwriting issues:
   * logs out, approves everything as the underwriter, logs back in as the original
   * role and reopens the submission on the Risk Analysis page.
   */
  async approveUnderwritingIssues() {
    const submissionNumber = GlobalData.getSubmissionNumber();
    if (!submissionNumber) throw new Error('Submission number is unknown; cannot route it to the underwriter.');
    const originalRole = this.currentRole || 'accountExecutive';

    log.section(`Routing ${submissionNumber} to the underwriter for approval`);
    await this.logout();
    await this.loginAs('underwriter');
    await this.openTransaction(submissionNumber);
    const riskPage = new RiskAnalysisPage(this.page);
    await riskPage.waitForPage();
    await riskPage.approveAllIssues();

    await this.logout();
    await this.loginAs(originalRole);
    await this.openTransaction(submissionNumber);
    await riskPage.waitForPage();
    if (this.flowName) this._setPageIndex(this.flowPages.indexOf('Risk Analysis'));
  }

  /**
   * Opens a policy / submission from the dashboard. Submissions in UW Review, Approved or
   * Rejected open in the wizard (Risk Analysis); everything else opens the policy detail page.
   */
  async openTransaction(number) {
    const target = number || GlobalData.getPolicyNumber() || GlobalData.getSubmissionNumber();
    const homePage = new HomePage(this.page);
    await homePage.openPolicy(target);
    if (await homePage.isOnPolicyDetail()) {
      if (this.flowName) this._setPageIndex(this.flowPages.indexOf('View Policy'));
      else GlobalData.setCurrentPage('View Policy');
    }
  }

  /* ------------------------------------------------------------------ */
  /* Page access & grabbers                                               */
  /* ------------------------------------------------------------------ */

  /**
   * Returns the page helper for ad-hoc actions:
   *   const drivers = await I.usePage('Drivers');
   *   await drivers.removeDriver('John Wick');
   */
  async usePage(pageName) {
    const known = Object.values(FLOWS).flat();
    const resolved = known.find((p) => p.replace(/\s/g, '').toLowerCase() === String(pageName).replace(/\s/g, '').toLowerCase()) || pageName;
    return this._pageObject(resolved);
  }

  async grabCurrentPage() {
    return GlobalData.getCurrentPage();
  }

  async grabCurrentFlow() {
    return this.flowName;
  }

  async grabPolicyNumber() {
    return GlobalData.getPolicyNumber();
  }

  async grabSubmissionNumber() {
    return GlobalData.getSubmissionNumber();
  }

  async grabPolicyStatus() {
    return GlobalData.getValue('policy.status');
  }

  /** Asserts the user is on the given page (heading visible). */
  async seePage(pageName) {
    const pageObj = await this.usePage(pageName);
    await pageObj.waitForPage();
  }
}

export default PolicyCenterHelper;
