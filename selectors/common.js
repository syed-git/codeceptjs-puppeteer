/**
 * Locator builders shared by every page. PolicyCenter renders forms as
 * `<div class="field"><label>Label *</label><input|select|textarea/></div>`,
 * so most fields are addressed by their visible label.
 *
 * Locators are XPath (start with `//`) or CSS. See selectors/<page>.js for the
 * page-specific ones.
 */

/** Button located by its visible text (icons inside the button are ignored). */
export const button = (text) => `//button[normalize-space()="${text}"]`;

/** Heading (h1/h2/h3) whose text starts with the given text. */
export const heading = (text) => `//*[self::h1 or self::h2 or self::h3][starts-with(normalize-space(), "${text}")]`;

/** Wizard step heading (`<h2>`) with the exact text. */
export const stepHeading = (text) => `//h2[normalize-space()="${text}"]`;

/** `<label>` of a form field; the trailing required-marker `*` is ignored. */
export const fieldLabel = (label) => `//div[contains(@class,"field")]/label[normalize-space(translate(., "*", ""))="${label}"]`;

/** `<input>` that belongs to the field labelled `label`. */
export const fieldInput = (label) => `${fieldLabel(label)}/following-sibling::input`;

/** `<select>` that belongs to the field labelled `label`. */
export const fieldSelect = (label) => `${fieldLabel(label)}/following-sibling::select`;

/** `<textarea>` that belongs to the field labelled `label`. */
export const fieldTextarea = (label) => `${fieldLabel(label)}/following-sibling::textarea`;

/** Validation message rendered under the field labelled `label`. */
export const fieldError = (label) => `${fieldLabel(label)}/following-sibling::span[contains(@class,"field-error")]`;

/** Radio/checkbox `<input>` wrapped in a `<label class="radio">` with the given text. */
export const radio = (text) => `//label[contains(@class,"radio")][contains(normalize-space(), "${text}")]//input`;

export const placeholder = (text) => `//*[@placeholder="${text}"]`;

/** Deepest element containing the given text. */
export const text = (value) => `//*[contains(normalize-space(), "${value}")][not(.//*[contains(normalize-space(), "${value}")])]`;

/** "Key: value" rows on the Review / Summary / View Policy pages. */
export const keyValue = (key) =>
  `//div[contains(@class,"kv")][span[contains(@class,"kv-key")][starts-with(normalize-space(), "${key}")]]/span[contains(@class,"kv-val")]`;

/** Card heading such as "Drivers (2)". */
export const sectionHeading = (title) => `//div[contains(@class,"card")]/h3[starts-with(normalize-space(), "${title}")]`;

/** Person / vehicle card that contains the given text. */
export const card = (containing) => `//div[contains(@class,"person-card")][.//*[contains(normalize-space(), "${containing}")]]`;

/** Elements shared by every authenticated screen. */
export const layout = {
  topbarBrand: '//div[contains(@class,"topbar-brand")]',
  userChip: '//div[contains(@class,"user-chip")]',
  signOutButton: '//button[@title="Sign out"]',
  dashboardHeading: '//h1[normalize-space()="Policies"]',
  wizardHead: '//div[contains(@class,"wizard-head")]',
  stepError: '//div[contains(@class,"form-error")]',
  transactionHistoryHeading: '//h3[contains(normalize-space(), "Transaction History")]',
};
