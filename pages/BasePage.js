import { container } from 'codeceptjs';
import { layout } from '../selectors/index.js';
import { log } from '../support/logger.js';

/**
 * Base class for all page classes.
 *
 * A page only knows *what* to do on its screen. *How* elements are clicked / filled
 * / checked lives in the shared helpers, and *where* the elements are lives in
 * selectors/<page>.js:
 *
 *   this.ui      -> PageInteractionHelper  (click, fillField, selectOption, checkCheckbox...)
 *   this.verify  -> PageValidationHelper   (validateElementPresent, validateElementContains...)
 *
 * Every page implements the flow contract used by PolicyCenterHelper:
 *   static pageName                  - label used by flows / navigator ("Drivers")
 *   get pageHeading                  - locator that proves the page is displayed
 *   fillOutPage(data, ctx)           - fills the page with the GrayStone data, stays on it
 *   clickOnNext(ctx)                 - moves to the next page of the flow
 */
export default class BasePage {
  static pageName = 'Base';

  constructor() {
    const helpers = container.helpers();
    this.ui = helpers.PageInteractionHelper;
    this.verify = helpers.PageValidationHelper;
    if (!this.ui || !this.verify) {
      throw new Error('PageInteractionHelper and PageValidationHelper must be enabled in codecept.conf.js');
    }
  }

  get pageName() {
    return this.constructor.pageName;
  }

  /** Locator that proves the page is displayed. Wizard steps use their `<h2>` (see selectors). */
  get pageHeading() {
    throw new Error(`${this.pageName} page must define 'get pageHeading()'`);
  }

  /* ------------------------------------------------------------------ */
  /* Page-flow contract                                                   */
  /* ------------------------------------------------------------------ */

  async waitForPage() {
    await this.verify.validateElementPresent(this.pageHeading, `'${this.pageName}' page is not displayed`);
    log.info(`user is on the '${this.pageName}' page`);
  }

  /** True when the page heading is visible right now (no long wait). */
  async isDisplayed(timeout = 1000) {
    return this.ui.isElementVisible(this.pageHeading, timeout);
  }

  // eslint-disable-next-line no-unused-vars
  async fillOutPage(data, ctx) {
    throw new Error(`${this.pageName} page must implement fillOutPage(data, ctx)`);
  }

  // eslint-disable-next-line no-unused-vars
  async clickOnNext(ctx) {
    throw new Error(`${this.pageName} page must implement clickOnNext(ctx)`);
  }

  async fillOutPageAndContinue(data, ctx) {
    await this.fillOutPage(data, ctx);
    await this.clickOnNext(ctx);
  }

  /* ------------------------------------------------------------------ */
  /* Shared behaviour                                                     */
  /* ------------------------------------------------------------------ */

  /** Goes back to the dashboard from wherever the user is (wizard, policy detail...). */
  async goToDashboard() {
    if (await this.ui.isElementVisible(layout.dashboardHeading, 500)) return;
    await this.ui.click(layout.topbarBrand);
    await this.ui.waitForElement(layout.dashboardHeading);
    log.info('returned to the dashboard');
  }

  /** Wizard footer error (`Please add at least one driver`, ...) or '' when there is none. */
  async grabStepError() {
    if (!(await this.ui.isElementVisible(layout.stepError, 500))) return '';
    return this.ui.grabTextFrom(layout.stepError);
  }

  /** Clicks Next-style button and fails with the wizard error message if the page refused to move on. */
  async clickAndExpectNextPage(button, nextHeading, nextPageName) {
    await this.ui.click(button);
    const error = await this.grabStepError();
    if (error) throw new Error(`[${this.pageName}] ${error}`);
    await this.ui.waitForElement(nextHeading);
    log.debug(`moved from '${this.pageName}' to '${nextPageName}'`);
  }

  /** Reads "PA-123456" style transaction numbers from the wizard header ('' when not shown). */
  async grabTransactionNumber() {
    if (!(await this.ui.isElementVisible(layout.wizardHead, 1000))) return '';
    const text = await this.ui.grabTextFrom(layout.wizardHead);
    return text.match(/PA-\d+/)?.[0] || '';
  }
}
