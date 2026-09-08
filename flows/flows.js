/**
 * Ordered pages of every business flow. Page names map to classes in pages/index.js.
 * Adding a flow = adding an entry here; adding a page = adding a class + a page name.
 */
export const WIZARD_PAGES = [
  'Policy Info',
  'Drivers',
  'Vehicles',
  'Coverages',
  'Quote',
  'Risk Analysis',
  'Review',
  'Policy Summary',
  'View Policy',
];

export const FLOWS = {
  'New Submission': ['Home Page', ...WIZARD_PAGES],
  'Policy Change': ['Home Page', ...WIZARD_PAGES],
  Cancellation: ['Home Page', 'Cancel Policy', 'View Policy'],
};

export const FLOW_NAMES = Object.keys(FLOWS);

/** Accepts "New Submission", "new submission", "newSubmission", "NEW_SUBMISSION"... */
export function resolveFlowName(name) {
  const normalize = (s) => String(s).replace(/[\s_-]/g, '').toLowerCase();
  const match = FLOW_NAMES.find((f) => normalize(f) === normalize(name));
  if (!match) throw new Error(`Unknown flow "${name}". Known flows: ${FLOW_NAMES.join(', ')}`);
  return match;
}

/** Accepts "Policy Info", "policy info", "PolicyInfo", "View Full Policy" (alias) ... */
export function resolvePageName(flowName, name) {
  const aliases = { viewfullpolicy: 'View Policy', dashboard: 'Home Page', home: 'Home Page', policyinformation: 'Policy Info', summary: 'Policy Summary' };
  const normalize = (s) => String(s).replace(/[\s_-]/g, '').toLowerCase();
  const pages = FLOWS[flowName];
  const wanted = aliases[normalize(name)] || name;
  const match = pages.find((p) => normalize(p) === normalize(wanted));
  if (!match) throw new Error(`Page "${name}" is not part of the '${flowName}' flow. Pages: ${pages.join(' -> ')}`);
  return match;
}
