import assert from 'assert';
import { relativeDate } from '../support/dates.js';

Feature('Policy Change @PolicyChange');

Before(({ I }) => {
  I.loginAs('accountExecutive');
});

Scenario('Add a driver and a vehicle to an in-force policy @smoke @regression', async ({ I }) => {
  const original = await I.getAutoGraystoneData({ numberOfInsured: '1', numberOfDrivers: '1', numberOfVehicles: '1' });
  await I.executeFlow('New Submission');
  const policyNumber = await I.grabPolicyNumber();

  // new data set: same insured, one extra driver and one extra vehicle driven by the new driver
  await I.getAutoGraystoneData({
    numberOfInsured: '1',
    Insured: original.Insured,
    numberOfDrivers: '1',
    numberOfVehicles: '1',
    Vehicles: { Vehicle1: { primaryDriver: '1' } },
  });

  await I.executeFlow('Policy Change', { policyNumber, changeEffectiveDate: relativeDate(10) });

  const viewPolicy = await I.usePage('View Policy');
  assert.strictEqual(await I.grabPolicyNumber(), policyNumber, 'policy change keeps the policy number');
  assert.strictEqual(await I.grabPolicyStatus(), 'In Force');
  assert.strictEqual(await viewPolicy.grabSectionCount('Drivers'), 2);
  assert.strictEqual(await viewPolicy.grabSectionCount('Vehicles'), 2);
  assert.ok(await viewPolicy.hasTransaction('Policy Change'), 'transaction history should list the policy change');
});

Scenario('Change coverages only, using the navigator to skip untouched pages @regression @navigator', async ({ I }) => {
  await I.getAutoGraystoneData({ numberOfInsured: '1', numberOfDrivers: '1', numberOfVehicles: '1', Coverages: { collision: '$500 ded' } });
  await I.executeFlow('New Submission');
  const policyNumber = await I.grabPolicyNumber();
  const quotedPremium = await I.grabGraystoneValue('quote.totalPremium');

  await I.createFlow('Policy Change', { policyNumber });
  await I.clickNextTo('Coverages'); // Policy Info, Drivers, Vehicles already hold the policy data

  const coverages = await I.usePage('Coverages');
  await coverages.setCoverage('collision', '$100 ded');
  await coverages.setCoverage('bodilyInjuryLiability', '500k/1M');
  await I.clickOnNext();

  await I.finishFlow();

  assert.strictEqual(await I.grabPolicyStatus(), 'In Force');
  assert.notStrictEqual(await I.grabGraystoneValue('quote.totalPremium'), quotedPremium, 'premium should change with the coverages');
});
