import assert from 'assert';

Feature('Add/Remove Drivers during policy change @regression');

Before(({ I }) => {
  I.loginAs('accountExecutive');
});

Scenario('Add a driver to an in-force policy', async ({ I }) => {
  await I.getAutoGraystoneData({ numberOfInsured: '1', numberOfDrivers: '1', numberOfVehicles: '1' });
  await I.executeFlow('New Submission');
  const policyNumber = await I.grabPolicyNumber();

  // new data set: same insured, one extra driver and one extra vehicle driven by the new driver
  const newData = await I.getAutoGraystoneData({
    numberOfDrivers: '1'
  });


  await I.createFlow('Policy Change', { policyNumber });
  await I.navigateToPage('Drivers');
  const drivers = await I.usePage('Drivers');
  await drivers.addDriver(newData.Drivers.Driver1);
  await I.navigateToPage('View Policy');

  const viewPolicy = await I.usePage('View Policy');
  assert.strictEqual(await I.grabPolicyNumber(), policyNumber, 'policy change keeps the policy number');
  assert.strictEqual(await I.grabTransactionNumber(), policyNumber, 'policy number is the transaction number of a policy change');
  assert.ok(await viewPolicy.hasTransaction('Policy Change'), 'transaction history should list the policy change');
  await I.logout();
});

Scenario('Remove a driver from a existing policy', async ({ I }) => {
  const autoGraystoneData = await I.getAutoGraystoneData({ 
    numberOfInsured: '1', 
    numberOfDrivers: '2', 
    numberOfVehicles: '1' 
  });
  await I.executeFlow('New Submission');
  const policyNumber = await I.grabPolicyNumber();
  
  // start policy change
  await I.createFlow('Policy Change', { policyNumber });
  await I.navigateToPage('Drivers');
  const drivers = await I.usePage('Drivers');
  await drivers.removeDriver(`${autoGraystoneData.Drivers.Driver2.firstName} ${autoGraystoneData.Drivers.Driver2.lastName}`);
  await I.navigateToPage('View Policy');

  const viewPolicy = await I.usePage('View Policy');
  assert.strictEqual(await I.grabPolicyNumber(), policyNumber, 'policy change keeps the policy number');
  assert.strictEqual(await I.grabTransactionNumber(), policyNumber, 'policy number is the transaction number of a policy change');
  assert.ok(await viewPolicy.hasTransaction('Policy Change'), 'transaction history should list the policy change');
  await I.logout();
});
