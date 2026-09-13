import assert from 'assert';
import { relativeDate } from '../../support/dates.js';

Feature('Cancellation @smoke');

Before(({ I }) => {
  I.loginAs('accountExecutive');
});

Scenario('Flat cancel an in-force policy and reinstate it', async ({ I }) => {
  await I.getAutoGraystoneData({
    numberOfInsured: '1',
    numberOfDrivers: '1',
    numberOfVehicles: '1',
    Cancellation: { type: 'Flat', reason: 'Insured request — sold vehicle' },
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

Scenario('Pro-rata cancellation with a future effective date', async ({ I }) => {
  await I.getAutoGraystoneData({
    numberOfInsured: '1',
    numberOfDrivers: '1',
    numberOfVehicles: '1',
    Cancellation: { type: 'Pro-rata', effectiveDate: relativeDate(30), reason: 'Moved out of state' },
  });
  await I.executeFlow('New Submission');

  await I.createFlow('Cancellation'); // opens the last issued policy and the cancellation modal
  const cancelPage = await I.usePage('Cancel Policy');
  await cancelPage.fillOutPage(await I.grabAutoGraystoneData());
  const refund = await cancelPage.grabEstimatedRefund();
  assert.match(refund, /\$/, 'pro-rata cancellation should show an estimated refund');

  await I.finishFlow();

  assert.strictEqual(await I.grabPolicyStatus(), 'Canceled');
});
