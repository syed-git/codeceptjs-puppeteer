import BasePage from './BasePage.js';
import { cancelPolicyPage } from '../selectors/index.js';
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

  get pageHeading() {
    return cancelPolicyPage.pageHeading;
  }

  async fillOutPage(data = {}) {
    await this.waitForPage();
    const cancellation = data.Cancellation || {};
    const type = matchOption(cancellation.type, CANCELLATION_TYPES, { fallback: 'Flat' });
    await this.selectCancellationType(type);
    if (type === 'Pro-rata' && cancellation.effectiveDate) {
      await this.ui.fillDateField(cancelPolicyPage.effectiveDateInput, cancellation.effectiveDate);
    }
    await this.ui.fillField(cancelPolicyPage.reasonInput, cancellation.reason || 'Insured request');
    log.info(`${type} cancellation prepared`);
  }

  async clickOnNext() {
    await this.ui.click(cancelPolicyPage.confirmCancellationButton);
    const error = await this.grabModalError();
    if (error) throw new Error(`[${this.pageName}] ${error}`);
    await this.ui.waitForElement(cancelPolicyPage.reinstateButton);
    GlobalData.setValue('policy.status', 'Canceled');
    log.info('policy cancelled');
  }

  async selectCancellationType(type) {
    await this.ui.click(cancelPolicyPage.cancellationTypeRadio(type));
  }

  async grabEstimatedRefund() {
    const text = await this.ui.grabTextFrom(cancelPolicyPage.estimatedRefund);
    return text.replace(/^Estimated refund:\s*/, '');
  }

  async keepPolicy() {
    await this.ui.click(cancelPolicyPage.keepPolicyButton);
    await this.ui.waitForElementHidden(cancelPolicyPage.modal);
  }

  async grabModalError() {
    if (!(await this.ui.isElementVisible(cancelPolicyPage.modalError, 500))) return '';
    return this.ui.grabTextFrom(cancelPolicyPage.modalError);
  }
}
