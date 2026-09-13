import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateAutoGraystoneData,
  OPTIONAL_INSURED_FIELDS,
  OPTIONAL_DRIVER_FIELDS,
  OPTIONAL_VEHICLE_FIELDS,
  OPTIONAL_COVERAGES,
} from '../support/graystoneGenerator.js';
import { toGraystoneDate, today } from '../support/dates.js';

const keysOf = (obj) => Object.keys(obj || {});

test('no input -> one insured, one driver, one vehicle and today as effective date', () => {
  const data = generateAutoGraystoneData();
  assert.equal(data.numberOfInsured, '1');
  assert.equal(data.numberOfDrivers, '1');
  assert.equal(data.numberOfVehicles, '1');
  assert.equal(data.effectiveDate, toGraystoneDate(today()));
  assert.deepEqual(keysOf(data.Insured), ['NamedInsured1']);
  assert.deepEqual(keysOf(data.Drivers), ['Driver1']);
  assert.deepEqual(keysOf(data.Vehicles), ['Vehicle1']);
});

test('required fields are generated, optional fields are not', () => {
  const data = generateAutoGraystoneData({ numberOfInsured: '2', numberOfDrivers: '2', numberOfVehicles: '2' });

  for (const insured of Object.values(data.Insured)) {
    for (const key of ['firstName', 'lastName', 'dateOfBirth', 'gender', 'isPrimaryInsured']) assert.ok(insured[key], key);
    for (const key of OPTIONAL_INSURED_FIELDS) assert.equal(key in insured, false, `${key} must not be generated`);
  }
  for (const driver of Object.values(data.Drivers)) {
    for (const key of ['firstName', 'lastName', 'dateOfBirth', 'gender', 'licenseNumber']) assert.ok(driver[key], key);
    assert.match(driver.licenseNumber, /^\d{10}$/);
    for (const key of OPTIONAL_DRIVER_FIELDS) assert.equal(key in driver, false, `${key} must not be generated`);
  }
  for (const vehicle of Object.values(data.Vehicles)) {
    for (const key of ['year', 'make', 'model', 'vin', 'ownership']) assert.ok(vehicle[key], key);
    assert.match(vehicle.vin, /^VIN[A-Z0-9]{12}$/);
    for (const key of OPTIONAL_VEHICLE_FIELDS) assert.equal(key in vehicle, false, `${key} must not be generated`);
  }
  assert.ok(data.Coverages.bodilyInjuryLiability);
  assert.ok(data.Coverages.propertyDamageLiability);
  for (const key of OPTIONAL_COVERAGES) assert.equal(key in data.Coverages, false, `${key} must not be generated`);
});

test('supplied values win and supplied optional fields are kept', () => {
  const data = generateAutoGraystoneData({
    effectiveDate: '01-15-2030',
    Insured: { NamedInsured1: { firstName: 'Joe', email: 'joe@example.com', zip: '10017' } },
    Drivers: { Driver1: { accidents: '3', relationshipToInsured: 'Spouse' } },
    Vehicles: { Vehicle1: { make: 'Toyota', primaryDriver: '1', usage: 'Commute' } },
    Coverages: { collision: '$250 ded', roadSideAssitance: 'true' },
  });
  assert.equal(data.effectiveDate, '01-15-2030');
  assert.equal(data.Insured.NamedInsured1.firstName, 'Joe');
  assert.equal(data.Insured.NamedInsured1.email, 'joe@example.com');
  assert.equal(data.Insured.NamedInsured1.zip, '10017');
  assert.equal(data.Insured.NamedInsured1.phone, undefined);
  assert.equal(data.Drivers.Driver1.accidents, '3');
  assert.equal(data.Drivers.Driver1.relationshipToInsured, 'Spouse');
  assert.equal(data.Drivers.Driver1.violations, undefined);
  assert.equal(data.Vehicles.Vehicle1.make, 'Toyota');
  assert.equal(data.Vehicles.Vehicle1.primaryDriver, '1');
  assert.equal(data.Vehicles.Vehicle1.usage, 'Commute');
  assert.equal(data.Vehicles.Vehicle1.costNew, undefined);
  assert.equal(data.Coverages.collision, '$250 ded');
  assert.equal(data.Coverages.roadSideAssitance, 'true');
  assert.equal(data.Coverages.comprehensive, undefined);
});

test('counts default to the number of supplied entries', () => {
  const data = generateAutoGraystoneData({ Drivers: { Driver1: {}, Driver2: { firstName: 'Jack' } } });
  assert.equal(data.numberOfDrivers, '2');
  assert.equal(data.numberOfInsured, '1');
  assert.equal(data.Drivers.Driver2.firstName, 'Jack');
});

test('numberOf* keys override the number of supplied entries', () => {
  const data = generateAutoGraystoneData({ numberOfVehicles: '3', Vehicles: { Vehicle1: { make: 'Ford' } } });
  assert.equal(data.numberOfVehicles, '3');
  assert.deepEqual(keysOf(data.Vehicles), ['Vehicle1', 'Vehicle2', 'Vehicle3']);
  assert.equal(data.Vehicles.Vehicle1.make, 'Ford');
});

test('isPrimaryInsured is true for NamedInsured1 only', () => {
  const data = generateAutoGraystoneData({
    numberOfInsured: '3',
    Insured: { NamedInsured1: { isPrimaryInsured: 'false' }, NamedInsured2: { isPrimaryInsured: 'true' } },
  });
  assert.equal(data.Insured.NamedInsured1.isPrimaryInsured, 'true');
  assert.equal(data.Insured.NamedInsured2.isPrimaryInsured, 'false');
  assert.equal(data.Insured.NamedInsured3.isPrimaryInsured, 'false');
});

test('generated people never share a full name', () => {
  for (let i = 0; i < 20; i++) {
    const data = generateAutoGraystoneData({ numberOfDrivers: '4' });
    const names = Object.values(data.Drivers).map((d) => `${d.firstName} ${d.lastName}`);
    assert.equal(new Set(names).size, names.length, names.join(', '));
  }
});
