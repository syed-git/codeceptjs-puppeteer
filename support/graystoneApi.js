import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Reference data set listing every supported key (see data/autoGraystoneTemplate.json). */
export const TEMPLATE = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../data/autoGraystoneTemplate.json'), 'utf8'));

/** Path of the data endpoint on the auto-graystone-data service. */
export const ENDPOINT = '/getAutoGraystoneData';

const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_RETRIES = 2;
const RETRY_DELAY_MS = 1500;

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** `base` filled with whatever `overrides` provides; keys unknown to `base` are kept as well. */
export function fillMissing(base, overrides = {}) {
  const result = { ...base };
  for (const [key, value] of Object.entries(overrides || {})) {
    if (value === undefined) continue;
    result[key] = isObject(value) && isObject(result[key]) ? fillMissing(result[key], value) : value;
  }
  return result;
}

/**
 * Raised when the data API cannot be reached or answers with an error.
 * `status` is the HTTP status (0 when no response was received) and `details`
 * the `[{ path, message }]` list the API returns for validation errors.
 */
export class GraystoneApiError extends Error {
  constructor(message, { url, status = 0, details = [], cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'GraystoneApiError';
    this.url = url;
    this.status = status;
    this.details = details;
  }
}

/**
 * Turns the configured URL into the full endpoint URL. Accepts the service root
 * (`https://host`) or the endpoint itself (`https://host/getAutoGraystoneData`).
 */
export function resolveEndpoint(url) {
  const value = String(url || '').trim();
  if (!value) {
    throw new GraystoneApiError(
      'AutoGraystone data API URL is not configured. Set "dataApiUrl" in config/env/<ENV>.json or the DATA_API_URL environment variable.',
    );
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    parsed = null;
  }
  if (!parsed || !/^https?:$/.test(parsed.protocol)) {
    throw new GraystoneApiError(`AutoGraystone data API URL "${value}" is not a valid URL (expected http(s)://host[:port])`, { url: value });
  }
  if (!/\/getAutoGraystoneData\/?$/i.test(parsed.pathname)) {
    parsed.pathname = `${parsed.pathname.replace(/\/+$/, '')}${ENDPOINT}`;
  }
  return parsed.toString();
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * POST /getAutoGraystoneData on the auto-graystone-data service and return the completed data set.
 *
 * Connection failures, timeouts and 5xx answers are retried (`retries` times) so a Render free
 * instance waking up from sleep does not fail the test. 4xx answers (validation errors) are not retried.
 */
export async function fetchAutoGraystoneData(
  url,
  body = {},
  { timeout = DEFAULT_TIMEOUT_MS, retries = DEFAULT_RETRIES, retryDelay = RETRY_DELAY_MS, fetchImpl = globalThis.fetch } = {},
) {
  if (body !== undefined && !isObject(body)) {
    throw new GraystoneApiError('getAutoGraystoneData expects a JSON object as input', { url });
  }
  const endpoint = resolveEndpoint(url);

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await sleep(retryDelay * attempt);
    try {
      return await requestOnce(endpoint, body || {}, { timeout, fetchImpl });
    } catch (error) {
      lastError = error;
      const retryable = error instanceof GraystoneApiError && (error.status === 0 || error.status >= 500);
      if (!retryable) throw error;
    }
  }
  throw new GraystoneApiError(`${lastError.message} (after ${retries + 1} attempts)`, {
    url: endpoint,
    status: lastError.status,
    details: lastError.details,
    cause: lastError,
  });
}

async function requestOnce(endpoint, body, { timeout, fetchImpl }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  let response;
  try {
    response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    const reason = error?.name === 'AbortError' ? `timed out after ${timeout} ms` : error?.cause?.message || error?.message || String(error);
    throw new GraystoneApiError(`AutoGraystone data API ${endpoint} is not reachable: ${reason}`, { url: endpoint, cause: error });
  } finally {
    clearTimeout(timer);
  }

  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : undefined;
  } catch {
    payload = undefined;
  }

  if (!response.ok) {
    const details = Array.isArray(payload?.details) ? payload.details : [];
    const summary = payload?.error || `HTTP ${response.status}`;
    const detailText = details.map((d) => `${d.path}: ${d.message}`).join('; ');
    throw new GraystoneApiError(
      `AutoGraystone data API answered ${response.status} - ${summary}${detailText ? ` (${detailText})` : ''}`,
      { url: endpoint, status: response.status, details },
    );
  }
  if (!isObject(payload)) {
    throw new GraystoneApiError(`AutoGraystone data API returned an unexpected body: ${text.slice(0, 200) || '<empty>'}`, {
      url: endpoint,
      status: response.status,
    });
  }
  return payload;
}
