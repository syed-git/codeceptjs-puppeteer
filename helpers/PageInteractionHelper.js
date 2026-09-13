import Helper from '@codeceptjs/helper';
import path from 'path';
import { normalizeDate } from '../support/dates.js';
import { log } from '../support/logger.js';

/**
 * Common element actions used by every page class (pages reach it as `this.ui`).
 * Works on the raw Puppeteer page so locators can be CSS or XPath
 * (anything starting with `//`, `(` or `./` is treated as XPath).
 *
 *   await this.ui.click(driversPage.addDriverButton);
 *   await this.ui.fillField(driversPage.firstNameInput, 'John');
 *   await this.ui.selectOption(driversPage.relationshipSelect, 'Spouse');
 *   await this.ui.checkCheckbox(policyInfoPage.primaryInsuredCheckbox);
 *
 * Note: the helper is also registered on `I`, but names that exist in the built-in
 * Puppeteer helper as well (click, fillField, selectOption...) resolve to the
 * Puppeteer version there. Pages always use `this.ui`.
 */
class PageInteractionHelper extends Helper {
  /** Converts an XPath expression into a Puppeteer `xpath/` selector. */
  static toSelector(locator) {
    if (typeof locator !== 'string' || !locator) throw new Error(`Invalid locator: ${JSON.stringify(locator)}`);
    if (locator.startsWith('//') || locator.startsWith('(') || locator.startsWith('./')) return `xpath/${locator}`;
    return locator;
  }

  get page() {
    const { page } = this.helpers.Puppeteer;
    if (!page) throw new Error('Browser page is not available yet. Is the Puppeteer helper enabled?');
    return page;
  }

  get timeout() {
    return this.helpers.Puppeteer.options.waitForTimeout || 15000;
  }

  /* ------------------------------------------------------------------ */
  /* Finding & waiting                                                    */
  /* ------------------------------------------------------------------ */

  /** Waits for the element and returns its handle (visible by default). */
  async waitForElement(locator, { visible = true, timeout = this.timeout } = {}) {
    try {
      return await this.page.waitForSelector(PageInteractionHelper.toSelector(locator), { visible, timeout });
    } catch (err) {
      throw new Error(`Element not found${visible ? ' (or not visible)' : ''} within ${timeout}ms: ${locator}\n${err.message}`);
    }
  }

  async waitForElementHidden(locator, timeout = this.timeout) {
    await this.page.waitForSelector(PageInteractionHelper.toSelector(locator), { hidden: true, timeout });
  }

  /**
   * True when the element becomes visible within `timeout` ms, false otherwise (never throws).
   * `timeout: 0` checks the current DOM state without waiting.
   */
  async isElementVisible(locator, timeout = 2000) {
    if (timeout <= 0) {
      const elements = await this.findElements(locator);
      const states = await Promise.all(elements.map((el) => el.isVisible()));
      return states.some(Boolean);
    }
    try {
      await this.page.waitForSelector(PageInteractionHelper.toSelector(locator), { visible: true, timeout });
      return true;
    } catch {
      return false;
    }
  }

  /** True when the element is attached to the DOM (visible or not). */
  async isElementPresent(locator) {
    return (await this.findElements(locator)).length > 0;
  }

  async findElements(locator) {
    return this.page.$$(PageInteractionHelper.toSelector(locator));
  }

  async grabElementCount(locator) {
    return (await this.findElements(locator)).length;
  }

  /* ------------------------------------------------------------------ */
  /* Actions                                                              */
  /* ------------------------------------------------------------------ */

  async scrollIntoView(element) {
    await element.evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'center' }));
  }

  async click(locator) {
    const element = await this.waitForElement(locator);
    await this.scrollIntoView(element);
    await element.click();
    log.debug(`clicked ${locator}`);
    await this.pause();
  }

  /** Clicks the n-th (0-based) element matching the locator. */
  async clickNth(locator, index) {
    const elements = await this.findElements(locator);
    if (!elements[index]) throw new Error(`Expected element #${index + 1} for ${locator}, found ${elements.length}`);
    await this.scrollIntoView(elements[index]);
    await elements[index].click();
    await this.pause();
  }

  /** Clears and types into a text/number input or textarea. */
  async fillField(locator, value) {
    const element = await this.waitForElement(locator);
    await this.scrollIntoView(element);
    await element.click({ clickCount: 3 });
    await element.press('Backspace');
    await element.type(String(value));
    log.debug(`filled ${locator} with '${value}'`);
  }

  /**
   * Sets an `<input type="date">` (accepts MM-DD-YYYY, MM/DD/YYYY or YYYY-MM-DD) through the
   * native value setter and fires input/change so React picks the change up.
   */
  async fillDateField(locator, value) {
    const isoDate = normalizeDate(value);
    const element = await this.waitForElement(locator);
    await this.scrollIntoView(element);
    await element.evaluate((el, v) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, isoDate);
    log.debug(`filled date ${locator} with '${isoDate}'`);
    await this.pause();
  }

  /** Selects a `<select>` option by its visible text (or value). */
  async selectOption(locator, optionText) {
    const element = await this.waitForElement(locator);
    await this.scrollIntoView(element);
    const options = await element.$$eval('option', (opts) => opts.map((o) => ({ value: o.value, text: o.textContent.trim() })));
    const match = options.find((o) => o.text === String(optionText) || o.value === String(optionText));
    if (!match) {
      throw new Error(`Option "${optionText}" not found for ${locator}. Available: ${options.map((o) => o.text).join(' | ')}`);
    }
    await element.select(match.value);
    log.debug(`selected '${match.text}' in ${locator}`);
    await this.pause();
  }

  async grabSelectOptions(locator) {
    const element = await this.waitForElement(locator);
    return element.$$eval('option', (opts) => opts.map((o) => o.textContent.trim()));
  }

  /** Ensures a checkbox / radio ends up in the requested state. */
  async setCheckbox(locator, shouldBeChecked = true) {
    const element = await this.waitForElement(locator, { visible: false });
    const isChecked = await element.evaluate((el) => el.checked);
    if (isChecked !== shouldBeChecked) {
      await this.scrollIntoView(element);
      await element.click();
      log.debug(`${shouldBeChecked ? 'checked' : 'unchecked'} ${locator}`);
      await this.pause();
    }
  }

  async checkCheckbox(locator) {
    await this.setCheckbox(locator, true);
  }

  async uncheckCheckbox(locator) {
    await this.setCheckbox(locator, false);
  }

  /** Radios are `<input>` elements inside `<label class="radio">`; clicking the input selects it. */
  async selectRadio(locator) {
    await this.setCheckbox(locator, true);
  }

  async isCheckboxChecked(locator) {
    const element = await this.waitForElement(locator, { visible: false });
    return element.evaluate((el) => el.checked);
  }

  async uploadFile(locator, filePath) {
    const input = await this.waitForElement(locator, { visible: false });
    await input.uploadFile(path.resolve(filePath));
    log.debug(`uploaded ${filePath} to ${locator}`);
    await this.pause(500);
  }

  async pressKey(key) {
    await this.page.keyboard.press(key);
  }

  /* ------------------------------------------------------------------ */
  /* Reading                                                              */
  /* ------------------------------------------------------------------ */

  async grabTextFrom(locator) {
    const element = await this.waitForElement(locator);
    return (await element.evaluate((el) => el.innerText)).trim();
  }

  /** Inner text of every element matching the locator. */
  async grabTextsFrom(locator) {
    const elements = await this.findElements(locator);
    return Promise.all(elements.map((el) => el.evaluate((e) => e.innerText.trim())));
  }

  async grabValueFrom(locator) {
    const element = await this.waitForElement(locator, { visible: false });
    return element.evaluate((el) => el.value);
  }

  async grabAttributeFrom(locator, attribute) {
    const element = await this.waitForElement(locator, { visible: false });
    return element.evaluate((el, attr) => el.getAttribute(attr), attribute);
  }

  async isElementEnabled(locator) {
    const element = await this.waitForElement(locator, { visible: false });
    return element.evaluate((el) => !el.disabled);
  }

  async grabPageUrl() {
    return this.page.url();
  }

  /** Small pause so React can re-render after an interaction. */
  async pause(ms = 150) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default PageInteractionHelper;
