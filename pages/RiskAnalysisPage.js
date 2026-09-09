import BasePage from './BasePage.js';
import { GlobalData } from '../support/GlobalData.js';
import { log } from '../support/logger.js';

export default class RiskAnalysisPage extends BasePage {
  static pageName = 'Risk Analysis';

  noIssuesMessage = '//h3[normalize-space()="No underwriting issues"]';
  issueCards = '//div[contains(@class,"issue-card")]';
  blockingIssues = '//div[contains(@class,"issue-card")][contains(@class,"blocking")]';
  issueTitle = (title) => `//div[contains(@class,"issue-card")][.//strong[contains(normalize-space(), "${title}")]]`;
  blockingTag = '//span[contains(@class,"blocking-tag")]';
  submitForApprovalButton = this.button('Submit for Approval');
  submittedBanner = '//div[contains(@class,"banner-info")][contains(., "Submitted for approval")]';
  approvedBanner = '//div[contains(@class,"banner-success")][contains(., "Approved by")]';
  rejectedBanner = '//div[contains(@class,"banner-danger")][contains(., "Rejected by")]';
  approveIssueButton = (title) => `${this.issueTitle(title)}//button[normalize-space()="Approve"]`;
  approveAllButton = '//div[contains(@class,"form-actions")]//button[normalize-space()="Approve"]';
  rejectButton = '//div[contains(@class,"form-actions")]//button[normalize-space()="Reject"]';
  nextButton = this.button('Next');

  /**
   * Account Executive: submits for approval when blocking underwriting issues exist.
   * Underwriter: approves every pending issue.
   */
  async fillOutPage(data, ctx = {}) {
    await this.waitForPage();
    const hasBlocking = await this.hasBlockingIssues();
    if (!hasBlocking) {
      log.info('no blocking underwriting issues');
      return;
    }
    if (ctx.role === 'underwriter') {
      await this.approveAllIssues();
      return;
    }
    if (await this.isVisible(this.submitForApprovalButton, 1000)) {
      await this.submitForApproval();
    } else {
      log.info('underwriting issues already submitted for approval');
    }
  }

  async clickOnNext() {
    await this.click(this.nextButton);
    const error = await this.grabStepError();
    if (error) throw new Error(`[${this.pageName}] ${error}`);
    await this.waitFor(this.stepHeading('Review'));
    GlobalData.setCurrentPage('Review');
  }

  /** True while blocking issues exist that an underwriter still has to approve. */
  async needsUnderwriterApproval() {
    return this.hasBlockingIssues();
  }

  async hasBlockingIssues() {
    return this.isVisible(this.blockingTag, 1500);
  }

  async hasUnderwritingIssues() {
    return this.isVisible(this.issueCards, 1500);
  }

  async grabIssueCount() {
    return this.count(this.issueCards);
  }

  async grabIssueTitles() {
    const cards = await this.findAll(`${this.issueCards}//strong`);
    return Promise.all(cards.map((c) => c.evaluate((el) => el.innerText.trim())));
  }

  async submitForApproval() {
    await this.click(this.submitForApprovalButton);
    await this.waitFor(this.submittedBanner);
    log.info('submission sent for underwriter approval');
  }

  async approveAllIssues() {
    await this.click(this.approveAllButton);
    await this.waitForHidden(this.blockingTag);
    log.info('all underwriting issues approved');
  }

  async approveIssue(title) {
    await this.click(this.approveIssueButton(title));
  }

  async rejectSubmission() {
    await this.click(this.rejectButton);
    await this.waitFor(this.rejectedBanner);
    log.info('submission rejected');
  }
}
