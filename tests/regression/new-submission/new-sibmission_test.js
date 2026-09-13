import assert from 'assert';
import { relativeDate } from '../../../support/dates.js';

Feature('New Submission @regression');

Before(({ I }) => {
  I.loginAs('accountExecutive');
});

Scenario('Issue a furure dated personal auto policy', async ({ I }) => {
  // no input -> 1 insured, 1 driver, 1 vehicle, effective today; optional fields are left empty
  await I.getAutoGraystoneData({
    effectiveDate: relativeDate(5)
  });

  await I.executeFlow('New Submission');

  const policyNumber = await I.grabPolicyNumber();
  assert.match(policyNumber, /^PA-\d+/, 'policy number should be generated');
  assert.strictEqual(await I.grabTransactionNumber(), policyNumber, 'submission number is stored for the flow');
  assert.strictEqual(await I.grabPolicyStatus(), 'In Force');
  await I.logout();
});

Scenario('Issue a policy with with raltionship to insured as Child', async ({ I }) => {
  await I.getAutoGraystoneData({
    Drivers: { 
        Driver1: { 
            relationshipToInsured: 'Child' 
        } 
    },
  });

  await I.executeFlow('New Submission');
  await I.logout();
});

Scenario('Issue a policy with with ownership as leased', async ({ I }) => {
  await I.getAutoGraystoneData(
    { 
        numberOfInsured: '1', 
        numberOfDrivers: '1', 
        numberOfVehicles: '1',
        Vehicles: {
            Vehicle1: {
                ownership: 'Leased',
                usage: 'Pleasure'
            }
        }
    });

  await I.executeFlow('New Submission');
  assert.strictEqual(await I.grabPolicyStatus(), 'In Force');
  await I.logout();
});
