/**
 * Test-scoped shared state. Reset at the start of every scenario by PolicyCenterHelper.
 * Holds the AutoGraystone data and the identifiers captured while running flows.
 */
class GlobalDataStore {
  constructor() {
    this.clear();
  }

  clear() {
    this.data = {};
    this.policyNumber = '';
    this.submissionNumber = '';
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
