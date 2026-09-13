import BasePage from './BasePage.js';
import { coveragesPage } from '../selectors/index.js';
import { log } from '../support/logger.js';
import { COVERAGES, isCoverageSelected, normalizeCoverageLimit } from '../support/normalizers.js';

/** Wizard step 4 - coverages (data.Coverages.<key>); only the keys present in the data are touched. */
export default class CoveragesPage extends BasePage {
  static pageName = 'Coverages';

  get pageHeading() {
    return coveragesPage.pageHeading;
  }

  async fillOutPage(data) {
    await this.waitForPage();
    const coverages = data.Coverages || {};
    for (const key of Object.keys(COVERAGES)) {
      if (coverages[key] === undefined) continue;
      await this.setCoverage(key, coverages[key]);
    }
  }

  async clickOnNext() {
    await this.clickAndExpectNextPage(coveragesPage.generateQuoteButton, coveragesPage.nextHeading, 'Quote');
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
    if (!def.required) await this.ui.setCheckbox(coveragesPage.coverageToggle(def.name), selected);
    if (!selected) {
      log.info(`coverage '${def.name}' not selected`);
      return;
    }
    const limit = normalizeCoverageLimit(key, value);
    if (limit) await this.ui.selectOption(coveragesPage.coverageLimit(def.name), limit);
    log.info(`coverage '${def.name}' selected with limit '${limit}'`);
  }

  async isCoverageSelected(key) {
    return this.ui.isCheckboxChecked(coveragesPage.coverageToggle(COVERAGES[key].name));
  }

  async grabCoverageLimit(key) {
    return this.ui.grabValueFrom(coveragesPage.coverageLimit(COVERAGES[key].name));
  }

  async grabCoveragePremium(key) {
    return this.ui.grabTextFrom(coveragesPage.coveragePremium(COVERAGES[key].name));
  }
}
