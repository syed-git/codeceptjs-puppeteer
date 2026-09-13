import BasePage from './BasePage.js';
import { quotePage } from '../selectors/index.js';
import { GlobalData } from '../support/GlobalData.js';
import { log } from '../support/logger.js';

/** Wizard step 5 - quote. Nothing to fill; records the premium. */
export default class QuotePage extends BasePage {
  static pageName = 'Quote';

  get pageHeading() {
    return quotePage.pageHeading;
  }

  async fillOutPage() {
    await this.waitForPage();
    const total = await this.grabTotalPremium();
    GlobalData.setValue('quote.totalPremium', total);
    const transactionNumber = await this.grabTransactionNumber();
    log.info(`quoted premium ${total}${transactionNumber ? ` on ${transactionNumber}` : ''}`);
  }

  async clickOnNext() {
    await this.clickAndExpectNextPage(quotePage.nextButton, quotePage.nextHeading, 'Risk Analysis');
  }

  async grabTotalPremium() {
    return this.ui.grabTextFrom(quotePage.totalPremium);
  }

  async grabLineAmount(label) {
    return this.ui.grabTextFrom(quotePage.quoteLine(label));
  }
}
