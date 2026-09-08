/**
 * Maps loosely written test-data values ("owned", "Commuting", "50,000/100,000",
 * "30/day, 900 max") onto the exact option labels rendered by PolicyCenter.
 */

export const OWNERSHIP_OPTIONS = ['Owned', 'Leased', 'Rented'];
export const USAGE_OPTIONS = ['Pleasure', 'Commute', 'Business', 'Farm'];
export const RELATIONSHIP_OPTIONS = ['Insured', 'Spouse', 'Child', 'Parent', 'Other'];
export const GENDER_OPTIONS = ['Male', 'Female', 'Other'];

/**
 * Coverage definitions: GrayStone key -> UI row name + valid limits.
 * Required coverages are always selected and cannot be turned off.
 */
export const COVERAGES = {
  bodilyInjuryLiability: {
    name: 'Bodily Injury Liability',
    limits: ['25k/50k', '50k/100k', '100k/300k', '250k/500k', '500k/1M'],
    required: true,
  },
  propertyDamageLiability: {
    name: 'Property Damage Liability',
    limits: ['25k', '50k', '100k', '250k'],
    required: true,
  },
  uninsuredMotorist: {
    name: 'Uninsured/Underinsured Motorist',
    limits: ['25k/50k', '50k/100k', '100k/300k', '250k/500k'],
    required: false,
  },
  medicalPayments: {
    name: 'Medical Payments',
    limits: ['1k', '5k', '10k', '25k'],
    required: false,
  },
  comprehensive: {
    name: 'Comprehensive',
    limits: ['$100 ded', '$250 ded', '$500 ded', '$1,000 ded'],
    required: false,
  },
  collision: {
    name: 'Collision',
    limits: ['$100 ded', '$250 ded', '$500 ded', '$1,000 ded'],
    required: false,
  },
  rentalReimbursement: {
    name: 'Rental Reimbursement',
    limits: ['$30/day', '$50/day', '$75/day'],
    required: false,
  },
  roadSideAssitance: {
    name: 'Roadside Assistance',
    limits: ['Basic', 'Premium'],
    required: false,
  },
};

export function isTruthy(value) {
  if (typeof value === 'boolean') return value;
  return /^(true|yes|y|1)$/i.test(String(value).trim());
}

export function isFalsy(value) {
  if (typeof value === 'boolean') return !value;
  return /^(false|no|n|0|none|off)$/i.test(String(value).trim());
}

/** Case-insensitive / prefix match against an option list, e.g. "owned" -> "Owned". */
export function matchOption(value, options, { fallback } = {}) {
  if (value === undefined || value === null || value === '') return fallback;
  const raw = String(value).trim();
  const lower = raw.toLowerCase();
  return (
    options.find((o) => o === raw) ||
    options.find((o) => o.toLowerCase() === lower) ||
    options.find((o) => lower.startsWith(o.toLowerCase()) || o.toLowerCase().startsWith(lower)) ||
    fallback ||
    raw
  );
}

/** "50,000" | "50000" | "50k" | "1M" -> "50k" / "1M" style token. */
function toKToken(part) {
  const cleaned = String(part).replace(/[$,\s]/g, '').toLowerCase();
  if (/^\d+(\.\d+)?[km]$/.test(cleaned)) return cleaned.replace('m', 'M');
  const num = Number(cleaned);
  if (Number.isNaN(num)) return cleaned;
  if (num >= 1_000_000) return `${num / 1_000_000}M`;
  if (num >= 1000) return `${num / 1000}k`;
  return `${num}k`; // "50" means 50k in shorthand test data
}

/**
 * Normalises a coverage limit into one of the UI option labels for that coverage.
 *   "50,0000/100,000" -> "50k/100k"      "250" -> "$250 ded"
 *   "30/day, 900 max" -> "$30/day"       "true" -> first limit (Basic)
 */
export function normalizeCoverageLimit(coverageKey, value) {
  const def = COVERAGES[coverageKey];
  if (!def) throw new Error(`Unknown coverage "${coverageKey}". Known: ${Object.keys(COVERAGES).join(', ')}`);
  if (value === undefined || value === null || value === '') return undefined;

  const raw = String(value).trim();
  const exact = matchOption(raw, def.limits, { fallback: null });
  if (exact && def.limits.includes(exact)) return exact;

  if (isTruthy(raw)) return def.limits[0];

  const limits = def.limits;
  if (limits[0].includes('/day')) {
    const perDay = raw.match(/\$?\s*(\d+)\s*\/\s*day/i) || raw.match(/(\d+)/);
    return limits.find((l) => l.startsWith(`$${perDay?.[1]}/`)) || limits[0];
  }
  if (limits[0].includes('ded')) {
    const amount = Number(raw.replace(/[^\d]/g, ''));
    return limits.find((l) => Number(l.replace(/[^\d]/g, '')) === amount) || limits[0];
  }
  if (limits[0].includes('/')) {
    const [a, b] = raw.split('/');
    // "50,0000/100,000" contains a typo in the first half; use the second half to pick the pair.
    const bToken = b !== undefined ? toKToken(b) : null;
    const aToken = toKToken(a);
    return (
      limits.find((l) => l === `${aToken}/${bToken}`) ||
      limits.find((l) => bToken && l.endsWith(`/${bToken}`)) ||
      limits.find((l) => l.startsWith(`${aToken}/`)) ||
      limits[0]
    );
  }
  const token = toKToken(raw);
  return limits.find((l) => l === token) || limits[0];
}

/** Whether a coverage should be selected, based on the GrayStone value. */
export function isCoverageSelected(coverageKey, value) {
  const def = COVERAGES[coverageKey];
  if (def.required) return true;
  if (value === undefined || value === null || value === '') return false;
  return !isFalsy(value);
}
