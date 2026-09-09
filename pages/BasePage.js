import { normalizeDate } from '../support/dates.js';
import { log } from '../support/logger.js';

const DEFAULT_TIMEOUT = 15000;

/**
 * Base class for all page helpers. Elements are located with raw Puppeteer
 * (`page.waitForSelector`, `page.$$`, ElementHandle actions). Locators may be
 * CSS or XPath (anything starting with `//` or `(` is treated as XPath).
 *
 * Every page exposes:
 *   static pageName                       - label used by flows / navigator
 *   waitForPage()                         - waits until the page is displayed
 *   fillOutPage(data, ctx)                - fills the page, stays on it
 *   clickOnNext(ctx)                      - moves to the next page of the flow
 *   fillOutPageAndContinue(data, ctx)     - fillOutPage + clickOnNext
 */
export default class BasePage {
  static pageName = 'Base';

  constructor(page, timeout = DEFAULT_TIMEOUT) {
    this.page = page;
    this.timeout = timeout;
  }

  get pageName() {
    return this.constructor.pageName;
  }

  /* ------------------------------------------------------------------ */
  /* Locator builders                                                     */
  /* ------------------------------------------------------------------ */

  /** Converts an XPath expression into a Puppeteer `xpath/` selector. */
  static toSelector(locator) {
    if (locator.startsWith('//') || locator.startsWith('(') || locator.startsWith('./')) {
      return `xpath/${locator}`;
    }
    return locator;
  }

  /** Button located by its visible text (icons inside the button are ignored). */
  button(text) {
    return `//button[normalize-space()="${text}"]`;
  }

  /** Heading (h1/h2/h3) whose text starts with the given text. */
  heading(text) {
    return `//*[self::h1 or self::h2 or self::h3][starts-with(normalize-space(), "${text}")]`;
  }

  /** Wizard step heading (`<h2>`) with the exact text. */
  stepHeading(text) {
    return `//h2[normalize-space()="${text}"]`;
  }

  /** `<label>` of a form field; the trailing required-marker `*` is ignored. */
  fieldLabel(label) {
    return `//div[contains(@class,"field")]/label[normalize-space(translate(., "*", ""))="${label}"]`;
  }

  /** `<input>` that belongs to the field labelled `label`. */
  fieldInput(label) {
    return `${this.fieldLabel(label)}/following-sibling::input`;
  }

  /** `<select>` that belongs to the field labelled `label`. */
  fieldSelect(label) {
    return `${this.fieldLabel(label)}/following-sibling::select`;
  }

  /** `<textarea>` that belongs to the field labelled `label`. */
  fieldTextarea(label) {
    return `${this.fieldLabel(label)}/following-sibling::textarea`;
  }

  /** Validation message rendered under the field labelled `label`. */
  fieldError(label) {
    return `${this.fieldLabel(label)}/following-sibling::span[contains(@class,"field-error")]`;
  }

  /** Radio/checkbox `<input>` wrapped in a `<label class="radio">` with the given text. */
  radio(text) {
    return `//label[contains(@class,"radio")][contains(normalize-space(), "${text}")]//input`;
  }

  placeholder(text) {
    return `//*[@placeholder="${text}"]`;
  }

  text(text) {
    return `//*[contains(normalize-space(), "${text}")][not(.//*[contains(normalize-space(), "${text}")])]`;
  }

  /* ------------------------------------------------------------------ */
  /* Element actions                                                      */
  /* ------------------------------------------------------------------ */

  async waitFor(locator, { visible = true, timeout = this.timeout } = {}) {
    const selector = BasePage.toSelector(locator);
    try {
      return await this.page.waitForSelector(selector, { visible, timeout });
    } catch (err) {
      throw new Error(`[${this.pageName}] Element not found: ${locator}\n${err.message}`);
    }
  }

  async waitForHidden(locator, timeout = this.timeout) {
    await this.page.waitForSelector(BasePage.toSelector(locator), { hidden: true, timeout });
  }

  async isVisible(locator, timeout = 2000) {
    try {
      await this.page.waitForSelector(BasePage.toSelector(locator), { visible: true, timeout });
      return true;
    } catch {
      return false;
    }
  }

  async findAll(locator) {
    return this.page.$$(BasePage.toSelector(locator));
  }

  async count(locator) {
    return (await this.findAll(locator)).length;
  }

  async scrollIntoView(element) {
    await element.evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'center' }));
  }

  async click(locator) {
    const element = await this.waitFor(locator);
    await this.scrollIntoView(element);
    await element.click();
    await this.settle();
  }

  async clickNth(locator, index) {
    const elements = await this.findAll(locator);
    if (!elements[index]) {
      throw new Error(`[${this.pageName}] Expected element #${index + 1} for ${locator}, found ${elements.length}`);
    }
    await this.scrollIntoView(elements[index]);
    await elements[index].click();
    await this.settle();
  }

  /** Clears and types into a text/number input. */
  async fill(locator, value) {
    const element = await this.waitFor(locator);
    await this.scrollIntoView(element);
    await element.click({ clickCount: 3 });
    await element.press('Backspace');
    await element.type(String(value));
  }

  /**
   * Sets an `<input type="date">` value (YYYY-MM-DD) through the native value
   * setter and fires input/change so React picks the change up.
   */
  async fillDate(locator, value) {
    const isoDate = normalizeDate(value);
    const element = await this.waitFor(locator);
    await this.scrollIntoView(element);
    await element.evaluate((el, v) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, isoDate);
    await this.settle();
  }

  /** Selects a `<select>` option by its visible text (or value). */
  async select(locator, optionText) {
    const element = await this.waitFor(locator);
    await this.scrollIntoView(element);
    const options = await element.$$eval('option', (opts) => opts.map((o) => ({ value: o.value, text: o.textContent.trim() })));
    const match = options.find((o) => o.text === String(optionText) || o.value === String(optionText));
    if (!match) {
      throw new Error(
        `[${this.pageName}] Option "${optionText}" not found for ${locator}. Available: ${options.map((o) => o.text).join(' | ')}`,
      );
    }
    await element.select(match.value);
    await this.settle();
  }

  /** Ensures a checkbox/radio ends up in the requested state. */
  async setChecked(locator, shouldBeChecked = true) {
    const element = await this.waitFor(locator, { visible: false });
    const isChecked = await element.evaluate((el) => el.checked);
    if (isChecked !== shouldBeChecked) {
      await this.scrollIntoView(element);
      await element.click();
      await this.settle();
    }
  }

  async isChecked(locator) {
    const element = await this.waitFor(locator, { visible: false });
    return element.evaluate((el) => el.checked);
  }

  async grabText(locator) {
    const element = await this.waitFor(locator);
    return (await element.evaluate((el) => el.innerText)).trim();
  }

  async grabValue(locator) {
    const element = await this.waitFor(locator, { visible: false });
    return element.evaluate((el) => el.value);
  }

  /** Small pause so React can re-render after an interaction. */
  async settle(ms = 150) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  /* ------------------------------------------------------------------ */
  /* Page-flow contract                                                   */
  /* ------------------------------------------------------------------ */

  /** Locator that proves the page is displayed. Wizard steps use their `<h2>`. */
  get pageHeading() {
    return this.stepHeading(this.pageName);
  }

  async waitForPage() {
    await this.waitFor(this.pageHeading);
    log.info(`user is on the '${this.pageName}' page`);
  }

  /** Top bar brand (visible on every authenticated screen) - clicking it returns to the dashboard. */
  get topbarBrand() {
    return '//div[contains(@class,"topbar-brand")]';
  }

  get dashboardHeading() {
    return '//h1[normalize-space()="Policies"]';
  }

  /** Goes back to the dashboard from wherever the user is (wizard, policy detail...). */
  async goToDashboard() {
    if (await this.isVisible(this.dashboardHeading, 500)) return;
    await this.click(this.topbarBrand);
    await this.waitFor(this.dashboardHeading);
    log.info('returned to the dashboard');
  }

  /** Wizard footer error (`Please add at least one driver`, ...). */
  async grabStepError() {
    if (!(await this.isVisible('//div[contains(@class,"form-error")]', 500))) return '';
    return this.grabText('//div[contains(@class,"form-error")]');
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

  /** Reads "PA-123456" style transaction numbers from the wizard header. */
  async grabTransactionNumber() {
    const header = await this.isVisible('//div[contains(@class,"wizard-head")]', 1000);
    if (!header) return '';
    const text = await this.grabText('//div[contains(@class,"wizard-head")]');
    return text.match(/PA-\d+/)?.[0] || '';
  }
}
