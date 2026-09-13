import Helper from '@codeceptjs/helper';
import { AssertionError } from 'assert';
import { log } from '../support/logger.js';

/**
 * Common element validations used by every page class (pages reach it as `this.verify`)
 * and available in tests on `I` (e.g. `await I.validateElementContains(locator, 'In Force')`).
 *
 * Every method throws an AssertionError with a readable message when the check fails.
 * Locators are CSS or XPath, exactly like PageInteractionHelper.
 */
class PageValidationHelper extends Helper {
  get ui() {
    return this.helpers.PageInteractionHelper;
  }

  fail(message, { actual, expected } = {}) {
    throw new AssertionError({ message, actual, expected });
  }

  /** Element is attached to the DOM (visible or hidden). */
  async validateElementExists(locator, message = '') {
    if (!(await this.ui.isElementPresent(locator))) {
      this.fail(`${message || 'Expected element to exist'}: ${locator}`);
    }
    log.debug(`element exists: ${locator}`);
  }

  async validateElementNotExists(locator, message = '') {
    if (await this.ui.isElementPresent(locator)) {
      this.fail(`${message || 'Expected element not to exist'}: ${locator}`);
    }
  }

  /** Element is present AND visible (waits up to `timeout` ms). */
  async validateElementPresent(locator, message = '', timeout = this.ui.timeout) {
    if (!(await this.ui.isElementVisible(locator, timeout))) {
      this.fail(`${message || 'Expected element to be visible'}: ${locator}`);
    }
    log.debug(`element visible: ${locator}`);
  }

  async validateElementNotPresent(locator, message = '', timeout = 2000) {
    if (await this.ui.isElementVisible(locator, timeout)) {
      this.fail(`${message || 'Expected element not to be visible'}: ${locator}`);
    }
  }

  /** Element's text contains `expected` (case-sensitive). */
  async validateElementContains(locator, expected, message = '') {
    const actual = await this.ui.grabTextFrom(locator);
    if (!actual.includes(String(expected))) {
      this.fail(`${message || 'Element text mismatch'}: expected "${actual}" to contain "${expected}" (${locator})`, { actual, expected });
    }
    log.debug(`element ${locator} contains '${expected}'`);
  }

  async validateElementNotContains(locator, unexpected, message = '') {
    const actual = await this.ui.grabTextFrom(locator);
    if (actual.includes(String(unexpected))) {
      this.fail(`${message || 'Element text mismatch'}: expected "${actual}" not to contain "${unexpected}" (${locator})`);
    }
  }

  /** Element's text equals `expected` exactly (after trimming). */
  async validateElementText(locator, expected, message = '') {
    const actual = await this.ui.grabTextFrom(locator);
    if (actual !== String(expected)) {
      this.fail(`${message || 'Element text mismatch'}: expected "${expected}", got "${actual}" (${locator})`, { actual, expected });
    }
  }

  /** Element's text matches the regular expression. */
  async validateElementMatches(locator, pattern, message = '') {
    const actual = await this.ui.grabTextFrom(locator);
    if (!pattern.test(actual)) {
      this.fail(`${message || 'Element text mismatch'}: expected "${actual}" to match ${pattern} (${locator})`);
    }
  }

  /** Value of an input / select / textarea. */
  async validateElementValue(locator, expected, message = '') {
    const actual = await this.ui.grabValueFrom(locator);
    if (String(actual) !== String(expected)) {
      this.fail(`${message || 'Field value mismatch'}: expected "${expected}", got "${actual}" (${locator})`, { actual, expected });
    }
  }

  async validateCheckboxChecked(locator, message = '') {
    if (!(await this.ui.isCheckboxChecked(locator))) this.fail(`${message || 'Expected checkbox to be checked'}: ${locator}`);
  }

  async validateCheckboxUnchecked(locator, message = '') {
    if (await this.ui.isCheckboxChecked(locator)) this.fail(`${message || 'Expected checkbox to be unchecked'}: ${locator}`);
  }

  async validateElementEnabled(locator, message = '') {
    if (!(await this.ui.isElementEnabled(locator))) this.fail(`${message || 'Expected element to be enabled'}: ${locator}`);
  }

  async validateElementDisabled(locator, message = '') {
    if (await this.ui.isElementEnabled(locator)) this.fail(`${message || 'Expected element to be disabled'}: ${locator}`);
  }

  /** Number of elements matching the locator. */
  async validateElementCount(locator, expected, message = '') {
    const actual = await this.ui.grabElementCount(locator);
    if (actual !== Number(expected)) {
      this.fail(`${message || 'Element count mismatch'}: expected ${expected}, got ${actual} (${locator})`, { actual, expected });
    }
  }

  /** Text appears anywhere on the page. */
  async validatePageContains(text, message = '') {
    const body = await this.ui.grabTextFrom('body');
    if (!body.includes(String(text))) this.fail(`${message || 'Expected page to contain'}: "${text}"`);
  }

  async validateUrlContains(fragment, message = '') {
    const url = await this.ui.grabPageUrl();
    if (!url.includes(String(fragment))) this.fail(`${message || 'URL mismatch'}: expected "${url}" to contain "${fragment}"`);
  }

  /** Plain value comparison with a readable failure, for data grabbed earlier. */
  async validateEquals(actual, expected, message = 'Values differ') {
    if (actual !== expected) this.fail(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`, { actual, expected });
  }
}

export default PageValidationHelper;
