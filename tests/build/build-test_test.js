import assert from 'assert';
import { relativeDate } from '../../support/dates.js';

Feature('New Submission @build');

Before(({ I }) => {
  I.loginAs('accountExecutive');
});

Scenario('Issue a current dated personal auto policy end to end', async ({ I }) => {
  await I.getAutoGraystoneData();

  await I.executeFlow('New Submission');

  const policyNumber = await I.grabPolicyNumber();
  assert.match(policyNumber, /^PA-\d+/, 'policy number should be generated');
  assert.strictEqual(await I.grabTransactionNumber(), policyNumber, 'submission number is stored for the flow');
  assert.strictEqual(await I.grabPolicyStatus(), 'In Force');
});

Scenario('Add a driver and a vehicle to an in-force policy', async ({ I }) => {
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
  assert.strictEqual(await I.grabTransactionNumber(), policyNumber, 'policy number is the transaction number of a policy change');
  assert.strictEqual(await I.grabPolicyStatus(), 'In Force');
  assert.strictEqual(await viewPolicy.grabSectionCount('Drivers'), 2);
  assert.strictEqual(await viewPolicy.grabSectionCount('Vehicles'), 2);
  assert.ok(await viewPolicy.hasTransaction('Policy Change'), 'transaction history should list the policy change');
});

Scenario('Flat cancel an in-force policy and reinstate it', async ({ I }) => {
  await I.getAutoGraystoneData({
    numberOfInsured: '1',
    numberOfDrivers: '1',
    numberOfVehicles: '1',
    Cancellation: { 
      type: 'Flat', 
      reason: 'Insured request — sold vehicle' 
    },
  });
  await I.executeFlow('New Submission');
  const policyNumber = await I.grabPolicyNumber();

  await I.executeFlow('Cancellation', { policyNumber });

  const viewPolicy = await I.usePage('View Policy');
  assert.strictEqual(await I.grabPolicyStatus(), 'Canceled');
  assert.match(await viewPolicy.grabCancellationBanner(), /Flat/i);
  assert.ok(await viewPolicy.hasTransaction('Cancellation'), 'transaction history should list the cancellation');

  await viewPolicy.reinstatePolicy();
  assert.strictEqual(await I.grabPolicyStatus(), 'In Force');
});
