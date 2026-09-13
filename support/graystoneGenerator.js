import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { addDays, addYears, today, toGraystoneDate } from './dates.js';
import { COVERAGES, GENDER_OPTIONS, OWNERSHIP_OPTIONS, RELATIONSHIP_OPTIONS, USAGE_OPTIONS } from './normalizers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Reference data set listing every supported key (see data/autoGraystoneTemplate.json). */
export const TEMPLATE = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../data/autoGraystoneTemplate.json'), 'utf8'));

/**
 * Keys that are only filled in the UI when the test data provides them. Missing optional
 * keys are NOT generated - the page simply leaves the field untouched.
 */
export const OPTIONAL_INSURED_FIELDS = ['email', 'phone', 'address', 'city', 'state', 'zip'];
export const OPTIONAL_DRIVER_FIELDS = ['licenseState', 'yearsLicensed', 'accidents', 'violations', 'relationshipToInsured', 'licenseFile'];
export const OPTIONAL_VEHICLE_FIELDS = ['usage', 'annualMileage', 'costNew', 'primaryDriver'];
export const OPTIONAL_COVERAGES = Object.keys(COVERAGES).filter((key) => !COVERAGES[key].required);
export const REQUIRED_COVERAGES = Object.keys(COVERAGES).filter((key) => COVERAGES[key].required);

/* ------------------------------------------------------------------ */
/* Random primitives                                                    */
/* ------------------------------------------------------------------ */

const FIRST_NAMES = ['James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda', 'David', 'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Daniel', 'Karen'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Wilson', 'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson', 'Martin', 'Lee', 'Walker', 'Hall'];
const STREETS = ['Main St', 'Oak Ave', 'Maple Dr', 'Cedar Ln', 'Park Blvd', 'Lake Rd', 'Hill St', 'Pine Ct'];
const CITIES = [
  ['New York', 'NY'], ['Los Angeles', 'CA'], ['Chicago', 'IL'], ['Houston', 'TX'], ['Phoenix', 'AZ'],
  ['Philadelphia', 'PA'], ['Miami', 'FL'], ['Denver', 'CO'], ['Seattle', 'WA'], ['Boston', 'MA'],
];
const MAKES = {
  Toyota: ['Camry', 'Corolla', 'RAV4', 'Highlander'],
  Honda: ['Civic', 'Accord', 'CRV', 'Pilot'],
  Ford: ['F150', 'Escape', 'Explorer', 'Mustang'],
  Chevrolet: ['Malibu', 'Equinox', 'Silverado', 'Tahoe'],
  Nissan: ['Altima', 'Rogue', 'Sentra', 'Pathfinder'],
  BMW: ['X3', 'X5', 'Series3', 'Series5'],
  Tesla: ['Model3', 'ModelY', 'ModelS'],
};

export const random = {
  int(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },
  pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  },
  digits(length) {
    return Array.from({ length }, () => random.int(0, 9)).join('');
  },
  alphanumeric(length) {
    const chars = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
    return Array.from({ length }, () => chars[random.int(0, chars.length - 1)]).join('');
  },
  firstName: () => random.pick(FIRST_NAMES),
  lastName: () => random.pick(LAST_NAMES),
  /** Adult date of birth (25-65 years old), MM-DD-YYYY. */
  dateOfBirth() {
    const base = addYears(today(), -random.int(25, 65));
    return toGraystoneDate(addDays(base, -random.int(0, 364)));
  },
  gender: () => random.pick(GENDER_OPTIONS),
  email: (first = random.firstName(), last = random.lastName()) => `${first}.${last}${random.int(1, 999)}@example.com`.toLowerCase(),
  phone: () => `${random.int(200, 999)}${random.digits(7)}`,
  address: () => `${random.int(10, 9999)} ${random.pick(STREETS)}`,
  cityState: () => random.pick(CITIES),
  zip: () => random.digits(5),
  licenseNumber: () => random.digits(10),
  licenseState: () => random.pick(CITIES)[1],
  vin: () => `VIN${random.alphanumeric(12)}`,
  makeModel() {
    const make = random.pick(Object.keys(MAKES));
    return [make, random.pick(MAKES[make])];
  },
  year: () => String(random.int(new Date().getFullYear() - 10, new Date().getFullYear())),
  ownership: () => random.pick(OWNERSHIP_OPTIONS),
  usage: () => random.pick(USAGE_OPTIONS),
  relationship: () => random.pick(RELATIONSHIP_OPTIONS.filter((r) => r !== 'Insured')),
  coverageLimit: (key) => random.pick(COVERAGES[key].limits),
  effectiveDate: () => toGraystoneDate(today()),
};

/* ------------------------------------------------------------------ */
/* Entity generators - only the fields PolicyCenter requires            */
/* ------------------------------------------------------------------ */

/** Required insured fields. `isPrimaryInsured` is true for NamedInsured1 only. */
export function randomInsured(index = 1) {
  return {
    firstName: random.firstName(),
    lastName: random.lastName(),
    dateOfBirth: random.dateOfBirth(),
    gender: random.gender(),
    isPrimaryInsured: index === 1 ? 'true' : 'false',
  };
}

/** Required driver fields (10-digit license). Optional record fields are not generated. */
export function randomDriver() {
  return {
    firstName: random.firstName(),
    lastName: random.lastName(),
    dateOfBirth: random.dateOfBirth(),
    gender: random.gender(),
    licenseNumber: random.licenseNumber(),
  };
}

/** Required vehicle fields (VIN + 12 chars). usage / mileage / cost / primary driver are not generated. */
export function randomVehicle() {
  const [make, model] = random.makeModel();
  return {
    year: random.year(),
    make,
    model,
    vin: random.vin(),
    ownership: random.ownership(),
  };
}

/** Limits for the coverages PolicyCenter always includes (liability). Optional coverages are not generated. */
export function randomCoverages() {
  return Object.fromEntries(REQUIRED_COVERAGES.map((key) => [key, random.coverageLimit(key)]));
}

/* ------------------------------------------------------------------ */
/* Merge                                                                */
/* ------------------------------------------------------------------ */

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

/** Count key wins, then the number of supplied entries, else 1. */
function resolveCount(input, countKey, groupKey, prefix) {
  if (input[countKey] !== undefined && input[countKey] !== '') return Math.max(Number(input[countKey]), 0);
  const provided = Object.keys(input[groupKey] || {}).filter((k) => k.startsWith(prefix)).length;
  return provided > 0 ? provided : 1;
}

function expandGroup(input, groupKey, prefix, count, generate) {
  const provided = input[groupKey] || {};
  const group = { ...provided };
  for (let i = 1; i <= count; i++) {
    const key = `${prefix}${i}`;
    group[key] = fillMissing(generate(i), provided[key]);
  }
  return group;
}

/**
 * Builds a complete-enough AutoGraystone data set from a partial input:
 *
 *   - values supplied in `input` always win
 *   - required fields that are missing get random-but-valid values (names, DOB, gender,
 *     10-digit license, VIN, year/make/model/ownership, liability coverages)
 *   - optional fields (OPTIONAL_*_FIELDS / OPTIONAL_COVERAGES) are NOT added when missing
 *   - `isPrimaryInsured` is true for NamedInsured1 and false for every other insured
 *   - without input: 1 insured, 1 driver, 1 vehicle, effective today
 *
 * `numberOfInsured` / `numberOfDrivers` / `numberOfVehicles` control how many entries the
 * Insured / Drivers / Vehicles groups get (default: number of supplied entries, else 1).
 */
export function generateAutoGraystoneData(input = {}) {
  if (!isObject(input)) throw new Error('getAutoGraystoneData expects a JSON object');

  const numberOfInsured = resolveCount(input, 'numberOfInsured', 'Insured', 'NamedInsured');
  const numberOfDrivers = resolveCount(input, 'numberOfDrivers', 'Drivers', 'Driver');
  const numberOfVehicles = resolveCount(input, 'numberOfVehicles', 'Vehicles', 'Vehicle');

  const data = {
    ...input,
    effectiveDate: input.effectiveDate || random.effectiveDate(),
    numberOfInsured: String(numberOfInsured),
    numberOfDrivers: String(numberOfDrivers),
    numberOfVehicles: String(numberOfVehicles),
    Insured: expandGroup(input, 'Insured', 'NamedInsured', numberOfInsured, randomInsured),
    Drivers: expandGroup(input, 'Drivers', 'Driver', numberOfDrivers, randomDriver),
    Vehicles: expandGroup(input, 'Vehicles', 'Vehicle', numberOfVehicles, randomVehicle),
    Coverages: fillMissing(randomCoverages(), input.Coverages),
  };
  if (input.Cancellation) data.Cancellation = { ...input.Cancellation };

  enforcePrimaryInsured(data.Insured);
  ensureUniqueNames(data.Insured, 'NamedInsured', numberOfInsured, input.Insured);
  ensureUniqueNames(data.Drivers, 'Driver', numberOfDrivers, input.Drivers);
  return data;
}

/** Cards are looked up by full name, so generated people must not share one (supplied names are left alone). */
function ensureUniqueNames(group, prefix, count, provided = {}) {
  const seen = new Set();
  for (let i = 1; i <= count; i++) {
    const key = `${prefix}${i}`;
    const person = group[key];
    const supplied = provided?.[key] || {};
    let fullName = `${person.firstName} ${person.lastName}`;
    let attempts = 0;
    while (seen.has(fullName) && attempts < 20 && (supplied.firstName === undefined || supplied.lastName === undefined)) {
      if (supplied.firstName === undefined) person.firstName = random.firstName();
      if (supplied.lastName === undefined) person.lastName = random.lastName();
      fullName = `${person.firstName} ${person.lastName}`;
      attempts++;
    }
    seen.add(fullName);
  }
}

/** NamedInsured1 is the primary insured; every other insured is not. */
function enforcePrimaryInsured(insured) {
  for (const [key, person] of Object.entries(insured)) {
    if (!isObject(person)) continue;
    person.isPrimaryInsured = key === 'NamedInsured1' ? 'true' : 'false';
  }
}
