import BasePage from './BasePage.js';
import { reviewPage } from '../selectors/index.js';
import { log } from '../support/logger.js';

/** Wizard step 7 - review and issue. */
export default class ReviewPage extends BasePage {
  static pageName = 'Review';

  get pageHeading() {
    return reviewPage.pageHeading;
  }

  async fillOutPage() {
    await this.waitForPage();
    log.info(`reviewing policy: premium ${await this.grabValueFor('Total Premium')}`);
  }

  async clickOnNext(ctx = {}) {
    await this.clickAndExpectNextPage(reviewPage.issuePolicyButton, reviewPage.nextHeading, 'Policy Summary');
    log.info(ctx.flowName === 'Policy Change' ? 'policy change issued' : 'policy issued');
  }

  async grabValueFor(key) {
    return this.ui.grabTextFrom(reviewPage.keyValue(key));
  }

  /** "Drivers (2)" -> 2 */
  async grabSectionCount(title) {
    const text = await this.ui.grabTextFrom(reviewPage.sectionHeading(title));
    return Number(text.match(/\((\d+)\)/)?.[1] ?? 0);
  }
}
