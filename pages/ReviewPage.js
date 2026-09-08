import BasePage from './BasePage.js';
import { GlobalData } from '../support/GlobalData.js';
import { log } from '../support/logger.js';

export default class ReviewPage extends BasePage {
  static pageName = 'Review';

  keyValue = (key) => `//div[contains(@class,"kv")][span[contains(@class,"kv-key")][starts-with(normalize-space(), "${key}")]]/span[contains(@class,"kv-val")]`;
  sectionHeading = (title) => `//div[contains(@class,"card")]/h3[starts-with(normalize-space(), "${title}")]`;
  issuePolicyButton = '//button[starts-with(normalize-space(), "Issue Policy")]';

  async fillOutPage() {
    await this.waitForPage();
    log.info(`reviewing policy: premium ${await this.grabValueFor('Total Premium')}`);
  }

  async clickOnNext(ctx = {}) {
    await this.click(this.issuePolicyButton);
    const error = await this.grabStepError();
    if (error) throw new Error(`[${this.pageName}] ${error}`);
    await this.waitFor('//div[contains(@class,"summary-hero")]');
    GlobalData.setCurrentPage('Policy Summary');
    log.info(ctx.flowName === 'Policy Change' ? 'policy change issued' : 'policy issued');
  }

  async grabValueFor(key) {
    return this.grabText(this.keyValue(key));
  }

  async grabSectionCount(title) {
    const text = await this.grabText(this.sectionHeading(title));
    return Number(text.match(/\((\d+)\)/)?.[1] ?? 0);
  }
}
