import assert from 'assert';
import { relativeDate } from '../support/dates.js';

Feature('New Submission @NewSubmission');

Before(({ I }) => {
  I.loginAs('accountExecutive');
});

Scenario('Issue a personal auto policy end to end @smoke @regression', async ({ I }) => {
  // no input -> 1 insured, 1 driver, 1 vehicle, effective today; optional fields are left empty
  const data = await I.getAutoGraystoneData();
  assert.strictEqual(data.numberOfDrivers, '1');
  assert.strictEqual(data.Insured.NamedInsured1.email, undefined, 'optional fields are not generated');

  await I.executeFlow('New Submission');

  const policyNumber = await I.grabPolicyNumber();
  assert.match(policyNumber, /^PA-\d+/, 'policy number should be generated');
  assert.strictEqual(await I.grabTransactionNumber(), policyNumber, 'submission number is stored for the flow');
  assert.strictEqual(await I.grabPolicyStatus(), 'In Force');
});

Scenario('Issue a policy with two insureds, two drivers and two vehicles @regression', async ({ I }) => {
  await I.getAutoGraystoneData({
    numberOfInsured: '2',
    numberOfDrivers: '2',
    numberOfVehicles: '2',
    Insured: { NamedInsured1: { firstName: 'Joe', lastName: 'Biden', email: 'joe.biden@example.com' } },
    Drivers: { Driver1: { firstName: 'John', lastName: 'Wick', relationshipToInsured: 'Insured' } },
    Vehicles: { Vehicle1: { make: 'Toyota', model: 'Camry', primaryDriver: '1' }, Vehicle2: { primaryDriver: '2' } },
    Coverages: { collision: '250', comprehensive: '250', roadSideAssitance: 'true' },
  });

  await I.executeFlow('New Submission');

  const viewPolicy = await I.usePage('View Policy');
  assert.strictEqual(await viewPolicy.grabSectionCount('Drivers'), 2);
  assert.strictEqual(await viewPolicy.grabSectionCount('Vehicles'), 2);
});

Scenario('Create a submission, navigate to Coverages, tweak them and finish the flow @regression @navigator', async ({ I }) => {
  await I.getAutoGraystoneData({ numberOfInsured: '1', numberOfDrivers: '1', numberOfVehicles: '1' });

  await I.createFlow('New Submission');
  await I.navigateTo('Coverages');
  assert.strictEqual(await I.grabCurrentPage(), 'Coverages');

  const coverages = await I.usePage('Coverages');
  await coverages.fillOutPage(await I.grabAutoGraystoneData());
  await coverages.setCoverage('collision', '$1,000 ded');
  await coverages.setCoverage('rentalReimbursement', 'false');
  assert.strictEqual(await coverages.grabCoverageLimit('collision'), '$1,000 ded');
  assert.strictEqual(await coverages.isCoverageSelected('rentalReimbursement'), false);

  await I.clickOnNext();
  assert.strictEqual(await I.grabCurrentPage(), 'Quote');
  await I.finishFlow();

  assert.strictEqual(await I.grabPolicyStatus(), 'In Force');
});

Scenario('Backdated effective date is routed to the underwriter and approved @regression @underwriting', async ({ I }) => {
  await I.getAutoGraystoneData({
    effectiveDate: relativeDate(-120),
    numberOfInsured: '1',
    numberOfDrivers: '1',
    numberOfVehicles: '1',
  });

  await I.createFlow('New Submission');
  await I.navigateTo('Risk Analysis');

  const riskAnalysis = await I.usePage('Risk Analysis');
  assert.strictEqual(await riskAnalysis.hasBlockingIssues(), true, 'a backdated policy should raise a blocking UW issue');

  await I.fillOutPage(); // Risk Analysis: submits the blocking issues for underwriter approval
  assert.strictEqual(await riskAnalysis.isSubmittedForApproval(), true);
  const submissionNumber = await I.grabTransactionNumber();
  assert.match(submissionNumber, /^PA-\d+/, 'submission number should be known after quoting');

  await I.logout();
  await I.loginAs('underwriter');
  const opened = await I.openTransaction(); // reopens the submission stored for the New Submission flow
  assert.strictEqual(opened, submissionNumber, 'openTransaction returns the submission number');
  await I.approveAllIssues();
  assert.strictEqual(await riskAnalysis.hasBlockingIssues(), false);

  await I.logout();
  await I.loginAs('accountExecutive');
  await I.finishFlow(); // reopens the submission, continues from Risk Analysis and issues the policy

  assert.strictEqual(await I.grabPolicyStatus(), 'In Force');
});

Scenario('High-risk driver cannot be issued without approval @regression @underwriting', async ({ I }) => {
  await I.getAutoGraystoneData({
    numberOfInsured: '1',
    numberOfDrivers: '1',
    numberOfVehicles: '1',
    Drivers: { Driver1: { accidents: '3', violations: '2' } },
  });

  await I.createFlow('New Submission');
  await I.navigateTo('Risk Analysis');

  const riskAnalysis = await I.usePage('Risk Analysis');
  const titles = await riskAnalysis.grabIssueTitles();
  assert.ok(titles.some((t) => /incidents|high.risk/i.test(t)), `expected a high-risk driver issue, got: ${titles.join(' | ')}`);
  assert.strictEqual(await riskAnalysis.hasBlockingIssues(), true);
});
