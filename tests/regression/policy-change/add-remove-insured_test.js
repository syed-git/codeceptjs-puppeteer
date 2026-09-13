import assert from 'assert';

Feature('Add/Remove Insured during policy change @regression');

Before(({ I }) => {
  I.loginAs('accountExecutive');
});

Scenario('Add a insured to an in-force policy', async ({ I }) => {
  await I.getAutoGraystoneData();
  await I.executeFlow('New Submission');
  const policyNumber = await I.grabPolicyNumber();

  // new data set: same insured, one extra driver and one extra vehicle driven by the new driver
  await I.getAutoGraystoneData({
    numberOfInsured: '2'
  });

  await I.createFlow('Policy Change', { policyNumber });
  await I.navigateToPage('Policy Info');
  await I.fillOutPage();
  await I.navigateToPage('View Policy');

  const viewPolicy = await I.usePage('View Policy');
  assert.strictEqual(await I.grabPolicyNumber(), policyNumber, 'policy change keeps the policy number');
  assert.strictEqual(await I.grabTransactionNumber(), policyNumber, 'policy number is the transaction number of a policy change');
  assert.ok(await viewPolicy.hasTransaction('Policy Change'), 'transaction history should list the policy change');
  await I.logout();
});

Scenario('Remove a existing insured from a existing policy', async ({ I }) => {
  const autoGraystoneData = await I.getAutoGraystoneData({ 
    numberOfInsured: '3'
  });
  await I.executeFlow('New Submission');
  const policyNumber = await I.grabPolicyNumber();
  
  // start policy change
  await I.createFlow('Policy Change', { policyNumber });
  await I.navigateToPage('Policy Info');
  const policyInfo = await I.usePage('Policy Info');
  await policyInfo.removeInsured(`${autoGraystoneData.Insured.NamedInsured2.firstName} ${autoGraystoneData.Insured.NamedInsured2.lastName}`);
  await I.navigateToPage('View Policy');

  const viewPolicy = await I.usePage('View Policy');
  assert.strictEqual(await I.grabPolicyNumber(), policyNumber, 'policy change keeps the policy number');
  assert.strictEqual(await I.grabTransactionNumber(), policyNumber, 'policy number is the transaction number of a policy change');
  assert.ok(await viewPolicy.hasTransaction('Policy Change'), 'transaction history should list the policy change');
  await I.logout();
});
