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
 * Business-flow actions exposed on `I`. A flow is an ordered list of pages
 * (flows/flows.js); every page knows how to fill itself and how to move on.
 *
 *   await I.loginAs('accountExecutive');
 *   await I.executeFlow('New Submission');      // createFlow + finishFlow
 *
 *   await I.createFlow('New Submission');       // Home Page step, lands on Policy Info
 *   await I.navigateTo('Coverages');            // fills Policy Info, Drivers, Vehicles; lands on Coverages
 *   await I.fillOutPage();                      // fills Coverages, stays there
 *   await I.clickOnNext();                      // -> Quote
 *   await I.navigateToPage('Review');           // clicks Next through Quote and Risk Analysis without filling
 *   await I.finishFlow();                       // fills the remaining pages up to View Policy
 *
 * Underwriting is orchestrated explicitly by the test - the flow never logs in or out by itself:
 *
 *   await I.createFlow('New Submission');
 *   await I.navigateTo('Risk Analysis');
 *   await I.fillOutPage();                      // submits for approval when blocking issues exist
 *   await I.logout();
 *   await I.loginAs('underwriter');
 *   await I.openTransaction();                  // opens the submission stored for the flow
 *   await I.approveAllIssues();
 *   await I.logout();
 *   await I.loginAs('accountExecutive');
 *   await I.finishFlow();                       // reopens the submission and issues it
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

  get flowPages() {
    if (!this.flowName) {
      throw new Error("No active flow. Call I.createFlow('New Submission') or I.executeFlow(...) first.");
    }
    return FLOWS[this.flowName];
  }

  get currentPageName() {
    return this.flowPages[this.pageIndex];
  }

  /** Context handed to every page: flow name, logged-in role, environment and the createFlow options. */
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
    return new PageClass();
  }

  _setPageIndex(index) {
    this.pageIndex = Math.min(Math.max(index, 0), this.flowPages.length - 1);
    GlobalData.setCurrentPage(this.flowPages[this.pageIndex]);
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

  _requireLogin() {
    if (!this.currentRole) throw new Error("Nobody is logged in. Call I.loginAs('accountExecutive') first.");
  }

  /**
   * Runs one page of the active flow: wait -> fill -> remember transaction number -> continue.
   * With `fill: false` the page is only waited for; with `continueToNext: false` the user stays on it.
   */
  async _runPage(index, { fill = true, continueToNext = true } = {}) {
    const pageName = this.flowPages[index];
    const pageObj = this._pageObject(pageName);
    log.section(`${this.flowName} › ${pageName}`);

    if (fill) await pageObj.fillOutPage(this._data(), this.ctx);
    else await pageObj.waitForPage();

    await this._captureTransactionNumber(pageObj);
    if (!continueToNext) return;

    if (pageObj instanceof RiskAnalysisPage && (await pageObj.hasBlockingIssues())) {
      throw new Error(
        `[Risk Analysis] Blocking underwriting issues need an underwriter. Use I.fillOutPage() (submits for approval), ` +
          `then I.logout() / I.loginAs('underwriter') / I.openTransaction() / I.approveAllIssues() and finish the flow as the account executive.`,
      );
    }

    await pageObj.clickOnNext(this.ctx);
    this._setPageIndex(index + 1);
  }

  async _captureTransactionNumber(pageObj) {
    const number = await pageObj.grabTransactionNumber();
    if (number) GlobalData.setTransactionNumber(this.flowName, number);
  }

  /** Index of `destination` in the active flow; navigation only moves forward. */
  _destinationIndex(destination) {
    const pageName = resolvePageName(this.flowName, destination);
    const index = this.flowPages.indexOf(pageName);
    if (index < this.pageIndex) {
      throw new Error(
        `Cannot navigate backwards from '${this.currentPageName}' to '${pageName}'. Flow order: ${this.flowPages.join(' -> ')}`,
      );
    }
    return index;
  }

  /** Looks at the browser and returns the index of the flow page currently displayed (-1 when none is). */
  async _detectPageIndex() {
    for (let i = 0; i < this.flowPages.length; i++) {
      if (await this._pageObject(this.flowPages[i]).isDisplayed(0)) return i;
    }
    return -1;
  }

  /** Aligns the internal page pointer with what the browser shows; returns the detected page name. */
  async _syncWithBrowser() {
    const index = await this._detectPageIndex();
    if (index === -1) {
      throw new Error(
        `Cannot tell which page of '${this.flowName}' is displayed. Expected one of: ${this.flowPages.join(', ')}. ` +
          `Are you logged in? Use I.openTransaction() to reopen the transaction.`,
      );
    }
    this._setPageIndex(index);
    return this.currentPageName;
  }

  /* ------------------------------------------------------------------ */
  /* Authentication                                                       */
  /* ------------------------------------------------------------------ */

  /**
   * Logs in as a configured role from config/env/<ENV>.json.
   *   await I.loginAs('accountExecutive');   // or 'underwriter', 'AE', 'UW'
   * Logs the current user out first when somebody is still signed in.
   */
  async loginAs(role = 'accountExecutive') {
    const user = this._resolveRole(role);
    const loginPage = new LoginPage();
    if (await loginPage.isLoggedIn()) {
      await loginPage.logout();
    } else if (!(await loginPage.isDisplayed(1000))) {
      await this.puppeteer.amOnPage('/');
    }
    await loginPage.login(user.username, user.password);
    this.currentRole = user.key;
  }

  async logout() {
    const loginPage = new LoginPage();
    await loginPage.logout();
    this.currentRole = null;
  }

  async grabCurrentRole() {
    return this.currentRole;
  }

  /* ------------------------------------------------------------------ */
  /* Flow API                                                             */
  /* ------------------------------------------------------------------ */

  /**
   * Runs the whole flow: every page is filled out and continued, from Home Page to View Policy.
   *   await I.executeFlow('New Submission');
   *   await I.executeFlow('Cancellation', { policyNumber: 'PA-100234' });
   */
  async executeFlow(flowName, options = {}) {
    await this.createFlow(flowName, options);
    await this.finishFlow();
  }

  /**
   * Starts the flow: fills out the Home Page step and leaves the user on the first wizard page.
   * Options:
   *   policyNumber         - policy to open for Policy Change / Cancellation (default: last issued one)
   *   changeEffectiveDate  - Policy Change effective date (default: data.effectiveDate)
   */
  async createFlow(flowName, options = {}) {
    this._requireLogin();
    this.flowName = resolveFlowName(flowName);
    this.flowOptions = options;
    GlobalData.setCurrentFlow(this.flowName);
    this._setPageIndex(0);
    log.section(`Starting flow '${this.flowName}': ${this.flowPages.join(' -> ')}`);
    await this._runPage(0);
  }

  /**
   * Derives the page currently displayed and fills out every page from there to the end of the flow.
   * When the user is on the dashboard (e.g. after logging back in) the flow's transaction is reopened first.
   */
  async finishFlow() {
    this._requireLogin();
    let index = await this._detectPageIndex();
    if (index <= 0 && this.pageIndex > 0) {
      await this.openTransaction();
      index = await this._detectPageIndex();
    }
    if (index === -1) await this._syncWithBrowser();
    else this._setPageIndex(index);
    log.section(`Finishing flow '${this.flowName}' from '${this.currentPageName}'`);

    const last = this.flowPages.length - 1;
    while (this.pageIndex < last) {
      await this._runPage(this.pageIndex);
    }
    await this._runPage(last, { continueToNext: false });
    log.section(`Flow '${this.flowName}' finished`);
  }

  /**
   * Fills out every page before `destination` and lands on it (destination itself is not filled).
   *   await I.navigateTo('Coverages');
   */
  async navigateTo(destination) {
    const target = this._destinationIndex(destination);
    while (this.pageIndex < target) {
      await this._runPage(this.pageIndex);
    }
    await this._pageObject(this.currentPageName).waitForPage();
  }

  /**
   * Clicks Next on every page until `destination` is displayed - nothing is filled
   * (useful for Policy Change where the pages already hold the policy data).
   *   await I.navigateToPage('Coverages');
   */
  async navigateToPage(destination) {
    const target = this._destinationIndex(destination);
    while (this.pageIndex < target) {
      await this._runPage(this.pageIndex, { fill: false });
    }
    await this._pageObject(this.currentPageName).waitForPage();
  }

  /**
   * Fills out the current page and stays on it. On Risk Analysis this submits the
   * transaction for underwriter approval when blocking issues exist.
   */
  async fillOutPage() {
    await this._runPage(this.pageIndex, { continueToNext: false });
  }

  /** Fills out the current page and moves to the next one. */
  async fillOutPageAndContinue() {
    await this._runPage(this.pageIndex);
  }

  /** Clicks the current page's Next/Continue button without filling anything. */
  async clickOnNext() {
    await this._runPage(this.pageIndex, { fill: false });
  }

  /** @deprecated use navigateToPage() */
  async clickNextTo(destination) {
    await this.navigateToPage(destination);
  }

  /** @deprecated use fillOutPage() */
  async fillOutCurrentPage() {
    await this.fillOutPage();
  }

  /* ------------------------------------------------------------------ */
  /* Transactions & underwriting                                          */
  /* ------------------------------------------------------------------ */

  /**
   * Searches the dashboard for a transaction and opens it. Without an argument the number stored
   * for the active flow is used (New Submission -> submission number, Policy Change -> policy number).
   * Submissions in UW Review / Approved / Rejected open in the wizard, everything else on the policy page.
   * Returns the transaction number that was opened.
   */
  async openTransaction(number) {
    this._requireLogin();
    const target = number || (this.flowName ? GlobalData.getTransactionNumber(this.flowName) : GlobalData.getPolicyNumber());
    if (!target) throw new Error('No transaction number is known yet. Pass one explicitly: I.openTransaction("PA-1000001").');

    const homePage = new HomePage();
    await homePage.goToDashboard();
    await homePage.openPolicy(target);

    if (this.flowName) {
      const index = await this._detectPageIndex();
      if (index > 0) this._setPageIndex(index);
    } else if (await homePage.isOnPolicyDetail()) {
      GlobalData.setCurrentPage('View Policy');
    }
    return target;
  }

  /** Transaction number of the active flow (submission number for New Submission, policy number otherwise). */
  async grabTransactionNumber() {
    return this.flowName ? GlobalData.getTransactionNumber(this.flowName) : GlobalData.getPolicyNumber() || GlobalData.getSubmissionNumber();
  }

  /** Underwriter: approves every blocking issue on the Risk Analysis page that is currently open. */
  async approveAllIssues() {
    const riskPage = new RiskAnalysisPage();
    await riskPage.waitForPage();
    await riskPage.approveAllIssues();
    if (this.flowName) this._setPageIndex(this.flowPages.indexOf('Risk Analysis'));
  }

  /** Underwriter: rejects the submission that is open on the Risk Analysis page. */
  async rejectSubmission() {
    const riskPage = new RiskAnalysisPage();
    await riskPage.waitForPage();
    await riskPage.rejectSubmission();
  }

  /* ------------------------------------------------------------------ */
  /* Page access & grabbers                                               */
  /* ------------------------------------------------------------------ */

  /**
   * Returns the page class instance for ad-hoc actions:
   *   const drivers = await I.usePage('Drivers');
   *   await drivers.removeDriver('John Wick');
   */
  async usePage(pageName) {
    const known = Object.values(FLOWS).flat();
    const normalize = (s) => String(s).replace(/\s/g, '').toLowerCase();
    const resolved = known.find((p) => normalize(p) === normalize(pageName)) || pageName;
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
