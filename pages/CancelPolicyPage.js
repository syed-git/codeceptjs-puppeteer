import BasePage from './BasePage.js';
import { GlobalData } from '../support/GlobalData.js';
import { log } from '../support/logger.js';
import { matchOption } from '../support/normalizers.js';

export const CANCELLATION_TYPES = ['Flat', 'Pro-rata'];

/**
 * "Cancel Policy PA-xxxx" modal on the policy detail page.
 * Test data: data.Cancellation = { type: 'Flat' | 'Pro-rata', effectiveDate, reason }
 */
export default class CancelPolicyPage extends BasePage {
  static pageName = 'Cancel Policy';

  modal = '//div[contains(@class,"modal")]';
  cancellationTypeRadio = (type) => `//label[contains(@class,"radio")][.//strong[starts-with(normalize-space(), "${type}")]]//input`;
  effectiveDateInput = this.fieldInput('Cancellation Effective Date');
  reasonInput = this.fieldTextarea('Reason');
  estimatedRefund = '//span[contains(@class,"field-hint")][contains(., "Estimated refund")]';
  keepPolicyButton = this.button('Keep Policy');
  confirmCancellationButton = this.button('Confirm Cancellation');
  reinstateButton = this.button('Reinstate');

  get pageHeading() {
    return '//h2[starts-with(normalize-space(), "Cancel Policy")]';
  }

  async fillOutPage(data = {}) {
    await this.waitForPage();
    const cancellation = data.Cancellation || {};
    const type = matchOption(cancellation.type, CANCELLATION_TYPES, { fallback: 'Flat' });
    await this.selectCancellationType(type);
    if (type === 'Pro-rata' && cancellation.effectiveDate) {
      await this.fillDate(this.effectiveDateInput, cancellation.effectiveDate);
    }
    await this.fill(this.reasonInput, cancellation.reason || 'Insured request — sold vehicle');
    log.info(`${type} cancellation prepared`);
  }

  async clickOnNext() {
    await this.click(this.confirmCancellationButton);
    const error = await this.grabModalError();
    if (error) throw new Error(`[${this.pageName}] ${error}`);
    await this.waitFor(this.reinstateButton);
    GlobalData.setValue('policy.status', 'Canceled');
    GlobalData.setCurrentPage('View Policy');
    log.info('policy cancelled');
  }

  async selectCancellationType(type) {
    await this.click(this.cancellationTypeRadio(type));
  }

  async grabEstimatedRefund() {
    const text = await this.grabText(this.estimatedRefund);
    return text.replace(/^Estimated refund:\s*/, '');
  }

  async keepPolicy() {
    await this.click(this.keepPolicyButton);
    await this.waitForHidden(this.modal);
  }

  async grabModalError() {
    const locator = `${this.modal}//span[contains(@class,"field-error")]`;
    if (!(await this.isVisible(locator, 500))) return '';
    return this.grabText(locator);
  }
}
