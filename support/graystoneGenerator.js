import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { addDays, addYears, today, toGraystoneDate } from './dates.js';
import { COVERAGES, GENDER_OPTIONS, OWNERSHIP_OPTIONS, RELATIONSHIP_OPTIONS, USAGE_OPTIONS } from './normalizers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const TEMPLATE = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../data/autoGraystoneTemplate.json'), 'utf8'));

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
/* Entity generators                                                    */
/* ------------------------------------------------------------------ */

export function randomInsured(index = 1) {
  const firstName = random.firstName();
  const lastName = random.lastName();
  const [city, state] = random.cityState();
  return {
    firstName,
    lastName,
    dateOfBirth: random.dateOfBirth(),
    gender: random.gender(),
    email: random.email(firstName, lastName),
    phone: random.phone(),
    address: random.address(),
    city,
    state,
    zip: random.zip(),
    isPrimaryInsured: index === 1 ? 'true' : 'false',
  };
}

/** Clean driving record by default so no underwriting issue is raised unless the test asks for one. */
export function randomDriver(index = 1) {
  return {
    firstName: random.firstName(),
    lastName: random.lastName(),
    dateOfBirth: random.dateOfBirth(),
    gender: random.gender(),
    licenseNumber: random.licenseNumber(),
    licenseState: random.licenseState(),
    yearsLicensed: String(random.int(1, 30)),
    accidents: String(random.int(0, 1)),
    violations: String(random.int(0, 1)),
    relationshipToInsured: index === 1 ? 'Insured' : random.relationship(),
  };
}

export function randomVehicle(index = 1, numberOfDrivers = 1) {
  const [make, model] = random.makeModel();
  return {
    year: random.year(),
    make,
    model,
    vin: random.vin(),
    ownership: random.ownership(),
    usage: random.usage(),
    annualMileage: String(random.int(3000, 25000)),
    costNew: String(random.int(15000, 80000)),
    primaryDriver: String(Math.min(index, numberOfDrivers)),
  };
}

export function randomCoverages() {
  return Object.fromEntries(Object.keys(COVERAGES).map((key) => [key, random.coverageLimit(key)]));
}

export function defaultCancellation() {
  return { ...TEMPLATE.Cancellation };
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

function resolveCount(input, countKey, groupKey, prefix) {
  const provided = Object.keys(input[groupKey] || {}).filter((k) => k.startsWith(prefix)).length;
  if (input[countKey] !== undefined && input[countKey] !== '') return Math.max(Number(input[countKey]), 0);
  if (provided > 0) return provided;
  return Number(TEMPLATE[countKey]);
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
 * Returns a complete AutoGraystone data set: every key from data/autoGraystoneTemplate.json
 * is present, values supplied in `input` win, everything else is random but valid for
 * PolicyCenter (10-digit licenses, VIN + 12 chars, clean driving records, adult DOBs...).
 *
 * `numberOfInsured` / `numberOfDrivers` / `numberOfVehicles` control how many entries the
 * Insured / Drivers / Vehicles groups get (defaults: the count of supplied entries, else the
 * template's value).
 */
export function generateAutoGraystoneData(input = {}) {
  if (!isObject(input)) throw new Error('getAutoGraystoneData expects a JSON object');

  const numberOfInsured = resolveCount(input, 'numberOfInsured', 'Insured', 'NamedInsured');
  const numberOfDrivers = resolveCount(input, 'numberOfDrivers', 'Drivers', 'Driver');
  const numberOfVehicles = resolveCount(input, 'numberOfVehicles', 'Vehicles', 'Vehicle');

  const data = {
    ...input,
    effectiveDate: input.effectiveDate ?? random.effectiveDate(),
    numberOfInsured: String(numberOfInsured),
    numberOfDrivers: String(numberOfDrivers),
    numberOfVehicles: String(numberOfVehicles),
    Insured: expandGroup(input, 'Insured', 'NamedInsured', numberOfInsured, randomInsured),
    Drivers: expandGroup(input, 'Drivers', 'Driver', numberOfDrivers, randomDriver),
    Vehicles: expandGroup(input, 'Vehicles', 'Vehicle', numberOfVehicles, (i) => randomVehicle(i, numberOfDrivers)),
    Coverages: fillMissing(randomCoverages(), input.Coverages),
    Cancellation: fillMissing(defaultCancellation(), input.Cancellation),
  };

  ensureSinglePrimaryInsured(data, numberOfInsured);
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

function ensureSinglePrimaryInsured(data, count) {
  const keys = Array.from({ length: count }, (_, i) => `NamedInsured${i + 1}`);
  const primaries = keys.filter((k) => /^(true|yes|1)$/i.test(String(data.Insured[k]?.isPrimaryInsured)));
  if (primaries.length === 1) return;
  keys.forEach((k, i) => {
    const keepAsPrimary = primaries.length === 0 ? i === 0 : k === primaries[0];
    data.Insured[k].isPrimaryInsured = keepAsPrimary ? 'true' : 'false';
  });
}
