import { button, stepHeading } from './common.js';

const issueCard = (title) => `//div[contains(@class,"issue-card")][.//strong[contains(normalize-space(), "${title}")]]`;

/** Wizard step 6 - "Risk Analysis" (underwriting issues). */
export const riskAnalysisPage = {
  pageHeading: stepHeading('Risk Analysis'),
  nextHeading: stepHeading('Review'),
  noIssuesMessage: '//h3[normalize-space()="No underwriting issues"]',
  issueCards: '//div[contains(@class,"issue-card")]',
  issueTitles: '//div[contains(@class,"issue-card")]//strong',
  blockingIssues: '//div[contains(@class,"issue-card")][contains(@class,"blocking")]',
  blockingTag: '//span[contains(@class,"blocking-tag")]',
  issueCard,
  approveIssueButton: (title) => `${issueCard(title)}//button[normalize-space()="Approve"]`,

  // account executive
  submitForApprovalButton: button('Submit for Approval'),
  submittedBanner: '//div[contains(@class,"banner-info")][contains(., "Submitted for approval")]',
  approvedBanner: '//div[contains(@class,"banner-success")][contains(., "Approved by")]',
  rejectedBanner: '//div[contains(@class,"banner-danger")][contains(., "Rejected by")]',

  // underwriter
  approveAllButton: '//div[contains(@class,"form-actions")]//button[normalize-space()="Approve"]',
  rejectButton: '//div[contains(@class,"form-actions")]//button[normalize-space()="Reject"]',
  nextButton: button('Next'),
};
