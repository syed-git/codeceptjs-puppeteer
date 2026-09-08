import Helper from '@codeceptjs/helper';
import { fillMissing, generateAutoGraystoneData, TEMPLATE } from '../support/graystoneGenerator.js';
import { GlobalData } from '../support/GlobalData.js';
import { relativeDate } from '../support/dates.js';
import { log } from '../support/logger.js';

/**
 * Test data helper exposed on `I`:
 *
 *   const data = await I.getAutoGraystoneData({ numberOfDrivers: '1', Drivers: { Driver1: { firstName: 'Harry' } } });
 *
 * Missing keys are filled with random-but-valid values following data/autoGraystoneTemplate.json.
 * The result is stored in GlobalData so the flow pages use it automatically.
 */
class GrayStoneHelper extends Helper {
  constructor(config) {
    super(config);
    this.overrides = {};
  }

  _before() {
    this.overrides = {};
  }

  /**
   * Builds the AutoGraystone data set from a partial JSON object, stores it for the flows and returns it.
   * Values set earlier in the test with setGraystoneValue()/setGraystoneRelativeDate() are applied too.
   * Pass `{ store: false }` as the second argument to only generate without affecting the current test data.
   */
  async getAutoGraystoneData(input = {}, { store = true } = {}) {
    const data = generateAutoGraystoneData(fillMissing(this.overrides, input));
    if (store) GlobalData.setData(data);
    log.info(
      `AutoGraystone data ready: effective ${data.effectiveDate}, ${data.numberOfInsured} insured, ${data.numberOfDrivers} driver(s), ${data.numberOfVehicles} vehicle(s)`,
    );
    return data;
  }

  /** Returns the data set currently used by the flows. */
  async grabAutoGraystoneData() {
    return GlobalData.getData();
  }

  /** Returns the template JSON that drives generation. */
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
