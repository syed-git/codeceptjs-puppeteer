import BasePage from './BasePage.js';
import { GlobalData } from '../support/GlobalData.js';
import { log } from '../support/logger.js';

export default class QuotePage extends BasePage {
  static pageName = 'Quote';

  totalPremium = '//div[contains(@class,"quote-total")]';
  quoteLine = (label) => `//div[contains(@class,"quote-line")][span[normalize-space()="${label}"]]/span[2]`;
  nextButton = this.button('Next');

  async fillOutPage() {
    await this.waitForPage();
    const total = await this.grabTotalPremium();
    GlobalData.setValue('quote.totalPremium', total);
    const transactionNumber = await this.grabTransactionNumber();
    if (transactionNumber) GlobalData.setSubmissionNumber(transactionNumber);
    log.info(`quoted premium ${total}${transactionNumber ? ` on ${transactionNumber}` : ''}`);
  }

  async clickOnNext() {
    await this.click(this.nextButton);
    await this.waitFor(this.stepHeading('Risk Analysis'));
    GlobalData.setCurrentPage('Risk Analysis');
  }

  async grabTotalPremium() {
    return this.grabText(this.totalPremium);
  }

  async grabLineAmount(label) {
    return this.grabText(this.quoteLine(label));
  }
}
