import { button, stepHeading } from './common.js';

/** Wizard step 5 - "Quote". */
export const quotePage = {
  pageHeading: stepHeading('Quote'),
  nextHeading: stepHeading('Risk Analysis'),
  totalPremium: '//div[contains(@class,"quote-total")]',
  quoteLine: (label) => `//div[contains(@class,"quote-line")][span[normalize-space()="${label}"]]/span[2]`,
  nextButton: button('Next'),
};
