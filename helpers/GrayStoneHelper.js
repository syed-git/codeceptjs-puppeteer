import Helper from '@codeceptjs/helper';
import { fetchAutoGraystoneData, fillMissing, resolveEndpoint, TEMPLATE } from '../support/graystoneApi.js';
import { GlobalData } from '../support/GlobalData.js';
import { relativeDate } from '../support/dates.js';
import { log } from '../support/logger.js';

/**
 * Test data helper exposed on `I`:
 *
 *   const data = await I.getAutoGraystoneData({ numberOfDrivers: '2', Drivers: { Driver1: { firstName: 'Harry' } } });
 *   await I.getAutoGraystoneData();   // 1 insured, 1 driver, 1 vehicle, effective today
 *
 * The data set is built by the auto-graystone-data REST service (github.com/syed-git/auto-graystone-data):
 * the partial input is POSTed to `<dataApiUrl>/getAutoGraystoneData` and the completed data set comes back.
 * Only the fields PolicyCenter requires are generated when missing (names, DOB, gender, license
 * number, VIN, year/make/model/ownership, liability coverages). Optional fields - email, phone,
 * address, city, state, zip, licenseState, yearsLicensed, accidents, violations, usage, annualMileage,
 * costNew, primaryDriver and the optional coverages - are present only when you pass them.
 * `isPrimaryInsured` is true for NamedInsured1 only. See data/autoGraystoneTemplate.json for every key.
 *
 * Helper config (codecept.conf.js): `{ require, environment }` - `environment.dataApiUrl` is the service URL
 * (config/env/<ENV>.json, overridable with DATA_API_URL). `timeout` / `retries` tune the HTTP call.
 *
 * The result is stored in GlobalData so the flow pages use it automatically.
 */
class GrayStoneHelper extends Helper {
  constructor(config) {
    super(config);
    this.overrides = {};
  }

  /** Full endpoint URL the helper posts to (DATA_API_URL wins over the environment file). */
  get dataApiUrl() {
    return resolveEndpoint(process.env.DATA_API_URL || this.config.environment?.dataApiUrl || this.config.dataApiUrl);
  }

  _before() {
    this.overrides = {};
  }

  /**
   * Calls the auto-graystone-data API with a partial JSON object, stores the returned data set for the
   * flows and returns it. Values set earlier in the test with setGraystoneValue()/setGraystoneRelativeDate()
   * are sent too. Pass `{ store: false }` as the second argument to only fetch without affecting the current
   * test data. Throws GraystoneApiError when the service is unreachable or rejects the input (HTTP 400 details
   * are included in the message).
   */
  async getAutoGraystoneData(input = {}, { store = true } = {}) {
    const url = this.dataApiUrl;
    const body = fillMissing(this.overrides, input);
    log.info(`POST ${url}`);
    const data = await fetchAutoGraystoneData(url, body, {
      timeout: this.config.timeout,
      retries: this.config.retries,
    });
    if (store) GlobalData.setData(data);
    log.info(
      `AutoGraystone data ready:\n${JSON.stringify(data, null, 2)}`
    );
    return data;
  }

  /** Returns the data set currently used by the flows. */
  async grabAutoGraystoneData() {
    return GlobalData.getData();
  }

  /** Returns the reference data set (data/autoGraystoneTemplate.json) listing every supported key. */
  async grabAutoGraystoneTemplate() {
    return JSON.parse(JSON.stringify(TEMPLATE));
  }

  /**
   * Sets a value on the current data by dotted path.
   *   await I.setGraystoneValue('Drivers.Driver1.accidents', '4');
   */
  async setGraystoneValue(dottedPath, value) {
    setPath(this.overrides, dottedPath, value);
    GlobalData.setValue(dottedPath, value);
    log.info(`graystone '${dottedPath}' set to '${value}'`);
  }

  async grabGraystoneValue(dottedPath) {
    return GlobalData.getValue(dottedPath);
  }

  /**
   * Sets a date field relative to today: positive days in the future, negative in the past.
   *   await I.setGraystoneRelativeDate('effectiveDate', -200);   // backdated policy
   */
  async setGraystoneRelativeDate(dottedPath, days) {
    const value = relativeDate(Number(days));
    await this.setGraystoneValue(dottedPath, value);
    return value;
  }
}

function setPath(target, dottedPath, value) {
  const parts = dottedPath.split('.');
  let cur = target;
  parts.forEach((part, idx) => {
    if (idx === parts.length - 1) {
      cur[part] = value;
    } else {
      if (cur[part] == null || typeof cur[part] !== 'object') cur[part] = {};
      cur = cur[part];
    }
  });
}

export default GrayStoneHelper;
