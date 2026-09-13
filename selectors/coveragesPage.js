import { button, stepHeading } from './common.js';

const coverageRow = (name) =>
  `//div[contains(@class,"coverage-row")][.//span[contains(@class,"coverage-name")][starts-with(normalize-space(), "${name}")]]`;

/** Wizard step 4 - "Coverages". Rows are addressed by the coverage name shown in the UI. */
export const coveragesPage = {
  pageHeading: stepHeading('Coverages'),
  nextHeading: stepHeading('Quote'),
  coverageRow,
  coverageToggle: (name) => `${coverageRow(name)}//input[@type="checkbox"]`,
  coverageLimit: (name) => `${coverageRow(name)}//select`,
  coveragePremium: (name) => `${coverageRow(name)}//span[contains(@class,"coverage-premium")]`,
  generateQuoteButton: button('Generate Quote'),
};
