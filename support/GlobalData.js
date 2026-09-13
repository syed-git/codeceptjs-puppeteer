/**
 * Test-scoped shared state. Reset at the start of every scenario by PolicyCenterHelper.
 * Holds the AutoGraystone data and the identifiers captured while running flows.
 *
 * Transaction numbers are stored per flow so `I.openTransaction()` can reopen the
 * right one: New Submission -> submission number, Policy Change / Cancellation -> policy number.
 */
class GlobalDataStore {
  constructor() {
    this.clear();
  }

  clear() {
    this.data = {};
    this.policyNumber = '';
    this.submissionNumber = '';
    this.transactions = {};
    this.currentFlow = '';
    this.currentPage = '';
  }

  setData(data) {
    this.data = data || {};
  }

  getData() {
    return this.data;
  }

  /** Read a value by dotted path, e.g. "Insured.NamedInsured1.firstName". */
  getValue(dottedPath) {
    return dottedPath.split('.').reduce((cur, key) => (cur == null ? undefined : cur[key]), this.data);
  }

  /** Write a value by dotted path, creating intermediate objects. */
  setValue(dottedPath, value) {
    const parts = dottedPath.split('.');
    let cur = this.data;
    parts.forEach((part, idx) => {
      if (idx === parts.length - 1) {
        cur[part] = value;
      } else {
        if (cur[part] == null || typeof cur[part] !== 'object') cur[part] = {};
        cur = cur[part];
      }
    });
  }

  setPolicyNumber(policyNumber) {
    this.policyNumber = policyNumber || '';
  }

  getPolicyNumber() {
    return this.policyNumber;
  }

  setSubmissionNumber(submissionNumber) {
    this.submissionNumber = submissionNumber || '';
  }

  getSubmissionNumber() {
    return this.submissionNumber;
  }

  /** Remembers the transaction number of a flow ("New Submission" -> "PA-1000012"). */
  setTransactionNumber(flowName, number) {
    if (!flowName || !number) return;
    this.transactions[flowName] = number;
    if (flowName === 'New Submission') this.submissionNumber = number;
    else this.policyNumber = number;
  }

  /** Transaction number stored for the flow (falls back to policy, then submission number). */
  getTransactionNumber(flowName) {
    return this.transactions[flowName] || this.policyNumber || this.submissionNumber || '';
  }

  setCurrentFlow(flowName) {
    this.currentFlow = flowName || '';
  }

  getCurrentFlow() {
    return this.currentFlow;
  }

  setCurrentPage(pageName) {
    this.currentPage = pageName || '';
  }

  getCurrentPage() {
    return this.currentPage;
  }
}

export const GlobalData = new GlobalDataStore();
