import { button, fieldInput, fieldTextarea } from './common.js';

const modal = '//div[contains(@class,"modal")]';

/** "Cancel Policy PA-xxxx" modal opened from the policy detail page. */
export const cancelPolicyPage = {
  pageHeading: '//h2[starts-with(normalize-space(), "Cancel Policy")]',
  modal,
  modalError: `${modal}//span[contains(@class,"field-error")]`,
  cancellationTypeRadio: (type) => `//label[contains(@class,"radio")][.//strong[starts-with(normalize-space(), "${type}")]]//input`,
  effectiveDateInput: fieldInput('Cancellation Effective Date'),
  reasonInput: fieldTextarea('Reason'),
  estimatedRefund: '//span[contains(@class,"field-hint")][contains(., "Estimated refund")]',
  keepPolicyButton: button('Keep Policy'),
  confirmCancellationButton: button('Confirm Cancellation'),
  reinstateButton: button('Reinstate'),
};
