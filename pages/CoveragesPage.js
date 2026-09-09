import BasePage from './BasePage.js';
import { GlobalData } from '../support/GlobalData.js';
import { log } from '../support/logger.js';
import { COVERAGES, isCoverageSelected, normalizeCoverageLimit } from '../support/normalizers.js';

export default class CoveragesPage extends BasePage {
  static pageName = 'Coverages';

  coverageRow = (name) => `//div[contains(@class,"coverage-row")][.//span[contains(@class,"coverage-name")][starts-with(normalize-space(), "${name}")]]`;
  coverageToggle = (name) => `${this.coverageRow(name)}//input[@type="checkbox"]`;
  coverageLimit = (name) => `${this.coverageRow(name)}//select`;
  coveragePremium = (name) => `${this.coverageRow(name)}//span[contains(@class,"coverage-premium")]`;
  generateQuoteButton = this.button('Generate Quote');

  async fillOutPage(data) {
    await this.waitForPage();
    const coverages = data.Coverages || {};
    for (const key of Object.keys(COVERAGES)) {
      if (coverages[key] === undefined) continue;
      await this.setCoverage(key, coverages[key]);
    }
  }

  async clickOnNext() {
    await this.click(this.generateQuoteButton);
    await this.waitFor(this.stepHeading('Quote'));
    GlobalData.setCurrentPage('Quote');
    log.info('quote generated');
  }

  /**
   * Selects/deselects a coverage row and picks the limit.
   *   setCoverage('collision', '$250 ded')        -> selected with $250 ded
   *   setCoverage('roadSideAssitance', 'true')    -> selected with the first limit
   *   setCoverage('medicalPayments', 'false')     -> deselected
   */
  async setCoverage(key, value) {
    const def = COVERAGES[key];
    if (!def) throw new Error(`[${this.pageName}] Unknown coverage key "${key}"`);
    const selected = isCoverageSelected(key, value);
    if (!def.required) await this.setChecked(this.coverageToggle(def.name), selected);
    if (!selected) {
      log.info(`coverage '${def.name}' not selected`);
      return;
    }
    const limit = normalizeCoverageLimit(key, value);
    if (limit) await this.select(this.coverageLimit(def.name), limit);
    log.info(`coverage '${def.name}' selected with limit '${limit}'`);
  }

  async isCoverageSelected(key) {
    return this.isChecked(this.coverageToggle(COVERAGES[key].name));
  }

  async grabCoverageLimit(key) {
    return this.grabValue(this.coverageLimit(COVERAGES[key].name));
  }

  async grabCoveragePremium(key) {
    return this.grabText(this.coveragePremium(COVERAGES[key].name));
  }
}
