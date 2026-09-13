import assert from 'assert';

Feature('Add/Remove Vehicles during policy change @regression');

Before(({ I }) => {
  I.loginAs('accountExecutive');
});

Scenario('Add 2 new vehicles to an in-force policy', async ({ I }) => {
  await I.getAutoGraystoneData();
  await I.executeFlow('New Submission');
  const policyNumber = await I.grabPolicyNumber();

  // new data set: same insured, one extra driver and one extra vehicle driven by the new driver
  await I.getAutoGraystoneData({
    numberOfVehicles: '2'
  });

  await I.createFlow('Policy Change', { policyNumber });
  await I.navigateToPage('Vehicles');
  await I.fillOutPage();
  await I.navigateToPage('View Policy');

  const viewPolicy = await I.usePage('View Policy');
  assert.strictEqual(await I.grabPolicyNumber(), policyNumber, 'policy change keeps the policy number');
  assert.strictEqual(await I.grabTransactionNumber(), policyNumber, 'policy number is the transaction number of a policy change');
  assert.ok(await viewPolicy.hasTransaction('Policy Change'), 'transaction history should list the policy change');
  await I.logout();
});

Scenario('Remove a existing vehicle from a existing policy', async ({ I }) => {
  const autoGraystoneData = await I.getAutoGraystoneData({ 
    numberOfVehicles: '3'
  });
  await I.executeFlow('New Submission');
  const policyNumber = await I.grabPolicyNumber();
  
  // start policy change
  await I.createFlow('Policy Change', { policyNumber });
  await I.navigateToPage('Vehicles');
  const vehicles = await I.usePage('Vehicles');
  await vehicles.removeVehicle(autoGraystoneData.Vehicles.Vehicle2.vin);
  await I.navigateToPage('View Policy');

  const viewPolicy = await I.usePage('View Policy');
  assert.strictEqual(await I.grabPolicyNumber(), policyNumber, 'policy change keeps the policy number');
  assert.strictEqual(await I.grabTransactionNumber(), policyNumber, 'policy number is the transaction number of a policy change');
  assert.ok(await viewPolicy.hasTransaction('Policy Change'), 'transaction history should list the policy change');
  await I.logout();
});
