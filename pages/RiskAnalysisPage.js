import BasePage from './BasePage.js';
import { riskAnalysisPage } from '../selectors/index.js';
import { log } from '../support/logger.js';

/**
 * Wizard step 6 - underwriting issues.
 *   Account executive: fillOutPage() submits for approval when blocking issues exist.
 *   Underwriter:       approveAllIssues() / rejectSubmission().
 * Nobody is logged in/out here - the test orchestrates the role switch (see README).
 */
export default class RiskAnalysisPage extends BasePage {
  static pageName = 'Risk Analysis';

  get pageHeading() {
    return riskAnalysisPage.pageHeading;
  }

  async fillOutPage(data, ctx = {}) {
    await this.waitForPage();
    if (!(await this.hasBlockingIssues())) {
      log.info('no blocking underwriting issues');
      return;
    }
    if (ctx.role === 'underwriter') {
      await this.approveAllIssues();
      return;
    }
    if (await this.ui.isElementVisible(riskAnalysisPage.submitForApprovalButton, 1000)) {
      await this.submitForApproval();
    } else {
      log.info('underwriting issues already submitted for approval - waiting for the underwriter');
    }
  }

  async clickOnNext() {
    await this.clickAndExpectNextPage(riskAnalysisPage.nextButton, riskAnalysisPage.nextHeading, 'Review');
  }

  /** True while blocking issues exist that an underwriter still has to approve. */
  async hasBlockingIssues() {
    return this.ui.isElementVisible(riskAnalysisPage.blockingTag, 1500);
  }

  async hasUnderwritingIssues() {
    return this.ui.isElementVisible(riskAnalysisPage.issueCards, 1500);
  }

  async isSubmittedForApproval() {
    return this.ui.isElementVisible(riskAnalysisPage.submittedBanner, 500);
  }

  async isApproved() {
    return this.ui.isElementVisible(riskAnalysisPage.approvedBanner, 500);
  }

  async grabIssueCount() {
    return this.ui.grabElementCount(riskAnalysisPage.issueCards);
  }

  async grabIssueTitles() {
    return this.ui.grabTextsFrom(riskAnalysisPage.issueTitles);
  }

  async submitForApproval() {
    await this.ui.click(riskAnalysisPage.submitForApprovalButton);
    await this.verify.validateElementPresent(riskAnalysisPage.submittedBanner, 'submission was not sent for approval');
    log.info('submission sent for underwriter approval');
  }

  /** Underwriter: approves every pending issue in one go. */
  async approveAllIssues() {
    if (!(await this.hasBlockingIssues())) {
      log.info('nothing to approve - no blocking underwriting issues');
      return;
    }
    await this.ui.click(riskAnalysisPage.approveAllButton);
    await this.ui.waitForElementHidden(riskAnalysisPage.blockingTag);
    log.info('all underwriting issues approved');
  }

  async approveIssue(title) {
    await this.ui.click(riskAnalysisPage.approveIssueButton(title));
  }

  async rejectSubmission() {
    await this.ui.click(riskAnalysisPage.rejectButton);
    await this.verify.validateElementPresent(riskAnalysisPage.rejectedBanner, 'submission was not rejected');
    log.info('submission rejected');
  }
}
