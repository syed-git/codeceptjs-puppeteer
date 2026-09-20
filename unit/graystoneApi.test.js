import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { fetchAutoGraystoneData, fillMissing, GraystoneApiError, resolveEndpoint, TEMPLATE } from '../support/graystoneApi.js';
import GrayStoneHelper from '../helpers/GrayStoneHelper.js';
import { GlobalData } from '../support/GlobalData.js';

/* A stand-in for the auto-graystone-data service: echoes the request body back inside a data set. */
let server;
let baseUrl;
let requests;
let failuresLeft = 0;

const dataSetFor = (body) => ({
  effectiveDate: body.effectiveDate || '09-20-2026',
  numberOfInsured: body.numberOfInsured || '1',
  numberOfDrivers: body.numberOfDrivers || '1',
  numberOfVehicles: body.numberOfVehicles || '1',
  Insured: { NamedInsured1: { firstName: 'Joe', lastName: 'Biden', isPrimaryInsured: 'true', ...body.Insured?.NamedInsured1 } },
  Drivers: { Driver1: { firstName: 'John', lastName: 'Wick', relationshipToInsured: 'Insured', ...body.Drivers?.Driver1 } },
  Vehicles: { Vehicle1: { vin: 'VIN376683HJGDJS', ownership: 'Owned', ...body.Vehicles?.Vehicle1 } },
  Coverages: { bodilyInjuryLiability: '50k/100k', propertyDamageLiability: '50k', collision: '$250 ded', ...body.Coverages },
});

before(async () => {
  server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      requests.push({ method: req.method, url: req.url, headers: req.headers, raw });
      const send = (status, payload) => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(payload));
      };
      if (req.url !== '/getAutoGraystoneData') return send(404, { status: 404, error: 'Not found' });
      if (req.method !== 'POST') return send(405, { status: 405, error: 'Method not allowed' });
      if (failuresLeft > 0) {
        failuresLeft--;
        return send(503, { status: 503, error: 'Service unavailable' });
      }
      const body = raw ? JSON.parse(raw) : {};
      if (body.Vehicles?.Vehicle1?.vin === 'bad') {
        return send(400, { status: 400, error: 'Invalid request body', details: [{ path: 'Vehicles.Vehicle1.vin', message: '"bad" must start with VIN' }] });
      }
      if (body.effectiveDate === 'hang') return; // never answers -> client timeout
      if (body.effectiveDate === 'html') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        return res.end('<html>oops</html>');
      }
      return send(200, dataSetFor(body));
    });
  });
  server.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

beforeEach(() => {
  requests = [];
  failuresLeft = 0;
  GlobalData.setData({});
  delete process.env.DATA_API_URL;
});

test('resolveEndpoint accepts the service root or the full endpoint and rejects blanks', () => {
  assert.equal(resolveEndpoint('https://data.example.com'), 'https://data.example.com/getAutoGraystoneData');
  assert.equal(resolveEndpoint('https://data.example.com/'), 'https://data.example.com/getAutoGraystoneData');
  assert.equal(resolveEndpoint('https://data.example.com/getAutoGraystoneData'), 'https://data.example.com/getAutoGraystoneData');
  assert.equal(resolveEndpoint('http://localhost:4000/api/'), 'http://localhost:4000/api/getAutoGraystoneData');
  assert.throws(() => resolveEndpoint(''), /not configured/);
  assert.throws(() => resolveEndpoint(undefined), /DATA_API_URL/);
  assert.throws(() => resolveEndpoint('localhost:4000'), /not a valid URL/);
});

test('fillMissing merges nested objects and keeps unknown keys', () => {
  const merged = fillMissing({ effectiveDate: '01-01-2030', Drivers: { Driver1: { accidents: '2' } } }, { Drivers: { Driver1: { firstName: 'Harry' } }, extra: 'x' });
  assert.deepEqual(merged, { effectiveDate: '01-01-2030', Drivers: { Driver1: { accidents: '2', firstName: 'Harry' } }, extra: 'x' });
});

test('POSTs the partial input as JSON and returns the completed data set', async () => {
  const data = await fetchAutoGraystoneData(baseUrl, { numberOfDrivers: '2', Drivers: { Driver1: { firstName: 'Harry' } } });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].method, 'POST');
  assert.equal(requests[0].url, '/getAutoGraystoneData');
  assert.equal(requests[0].headers['content-type'], 'application/json');
  assert.deepEqual(JSON.parse(requests[0].raw), { numberOfDrivers: '2', Drivers: { Driver1: { firstName: 'Harry' } } });
  assert.equal(data.numberOfDrivers, '2');
  assert.equal(data.Drivers.Driver1.firstName, 'Harry');
  assert.equal(data.Coverages.collision, '$250 ded');
});

test('no input -> an empty JSON object is sent', async () => {
  await fetchAutoGraystoneData(baseUrl);
  assert.equal(requests[0].raw, '{}');
});

test('non-object input is rejected before calling the API', async () => {
  await assert.rejects(fetchAutoGraystoneData(baseUrl, 'nope'), GraystoneApiError);
  await assert.rejects(fetchAutoGraystoneData(baseUrl, ['x']), /expects a JSON object/);
  assert.equal(requests.length, 0);
});

test('validation errors (HTTP 400) surface the API details and are not retried', async () => {
  const error = await fetchAutoGraystoneData(baseUrl, { Vehicles: { Vehicle1: { vin: 'bad' } } }, { retryDelay: 1 }).catch((e) => e);
  assert.ok(error instanceof GraystoneApiError);
  assert.equal(error.status, 400);
  assert.deepEqual(error.details, [{ path: 'Vehicles.Vehicle1.vin', message: '"bad" must start with VIN' }]);
  assert.match(error.message, /400 - Invalid request body \(Vehicles\.Vehicle1\.vin: "bad" must start with VIN\)/);
  assert.equal(requests.length, 1);
});

test('5xx answers are retried, then succeed', async () => {
  failuresLeft = 2;
  const data = await fetchAutoGraystoneData(baseUrl, {}, { retries: 2, retryDelay: 1 });
  assert.equal(requests.length, 3);
  assert.equal(data.numberOfInsured, '1');
});

test('5xx answers exhaust the retries', async () => {
  failuresLeft = 5;
  const error = await fetchAutoGraystoneData(baseUrl, {}, { retries: 1, retryDelay: 1 }).catch((e) => e);
  assert.equal(error.status, 503);
  assert.match(error.message, /after 2 attempts/);
  assert.equal(requests.length, 2);
});

test('an unreachable service is reported with the URL', async () => {
  const error = await fetchAutoGraystoneData('http://127.0.0.1:9', {}, { retries: 0 }).catch((e) => e);
  assert.ok(error instanceof GraystoneApiError);
  assert.equal(error.status, 0);
  assert.match(error.message, /http:\/\/127\.0\.0\.1:9\/getAutoGraystoneData is not reachable/);
});

test('a hanging service times out', async () => {
  const error = await fetchAutoGraystoneData(baseUrl, { effectiveDate: 'hang' }, { timeout: 50, retries: 0 }).catch((e) => e);
  assert.match(error.message, /timed out after 50 ms/);
});

test('a non-JSON answer is reported', async () => {
  const error = await fetchAutoGraystoneData(baseUrl, { effectiveDate: 'html' }, { retries: 0 }).catch((e) => e);
  assert.match(error.message, /unexpected body: <html>oops<\/html>/);
});

test('TEMPLATE lists the reference data set', () => {
  assert.equal(TEMPLATE.Insured.NamedInsured1.isPrimaryInsured, 'true');
  assert.match(TEMPLATE.Vehicles.Vehicle1.vin, /^VIN[A-Z0-9]{12}$/);
});

/* ------------------------------------------------------------------ */
/* GrayStoneHelper on top of the client                                 */
/* ------------------------------------------------------------------ */

const helperFor = (config = {}) => new GrayStoneHelper({ environment: { dataApiUrl: baseUrl }, retries: 0, ...config });

test('I.getAutoGraystoneData calls the API, stores the result and returns it', async () => {
  const helper = helperFor();
  const data = await helper.getAutoGraystoneData({ Insured: { NamedInsured1: { firstName: 'Ann' } } });
  assert.equal(requests.length, 1);
  assert.equal(data.Insured.NamedInsured1.firstName, 'Ann');
  assert.deepEqual(GlobalData.getData(), data);
  assert.deepEqual(await helper.grabAutoGraystoneData(), data);
});

test('I.getAutoGraystoneData(input, { store: false }) leaves the current test data alone', async () => {
  const helper = helperFor();
  GlobalData.setData({ marker: 'kept' });
  await helper.getAutoGraystoneData({}, { store: false });
  assert.deepEqual(GlobalData.getData(), { marker: 'kept' });
});

test('values set with setGraystoneValue / setGraystoneRelativeDate are sent to the API', async () => {
  const helper = helperFor();
  helper._before();
  await helper.setGraystoneValue('Drivers.Driver1.accidents', '4');
  const date = await helper.setGraystoneRelativeDate('effectiveDate', -10);
  await helper.getAutoGraystoneData({ Drivers: { Driver1: { firstName: 'Harry' } } });
  assert.deepEqual(JSON.parse(requests[0].raw), { effectiveDate: date, Drivers: { Driver1: { accidents: '4', firstName: 'Harry' } } });
});

test('DATA_API_URL overrides the environment file', async () => {
  process.env.DATA_API_URL = baseUrl;
  const helper = helperFor({ environment: { dataApiUrl: 'http://127.0.0.1:9' } });
  await helper.getAutoGraystoneData();
  assert.equal(requests.length, 1);
});

test('a missing URL is a clear configuration error', async () => {
  const helper = new GrayStoneHelper({});
  await assert.rejects(helper.getAutoGraystoneData(), /not configured/);
});
