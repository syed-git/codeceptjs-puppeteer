import { keyValue, sectionHeading, stepHeading } from './common.js';

/** Wizard step 7 - "Review" (issue the policy). */
export const reviewPage = {
  pageHeading: stepHeading('Review'),
  nextHeading: '//div[contains(@class,"summary-hero")]',
  keyValue,
  sectionHeading,
  issuePolicyButton: '//button[starts-with(normalize-space(), "Issue Policy")]',
};
