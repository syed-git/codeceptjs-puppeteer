import assert from 'assert';
import { relativeDate } from '../../support/dates.js';

Feature('New Submission @smoke');

Before(({ I }) => {
  I.loginAs('accountExecutive');
});

Scenario('Issue a policy with two insureds, two drivers and two vehicles', async ({ I }) => {
  await I.getAutoGraystoneData({
    numberOfInsured: '2',
    numberOfDrivers: '2',
    numberOfVehicles: '2'
  });

  await I.executeFlow('New Submission');

  const viewPolicy = await I.usePage('View Policy');
  assert.strictEqual(await viewPolicy.grabSectionCount('Drivers'), 2);
  assert.strictEqual(await viewPolicy.grabSectionCount('Vehicles'), 2);
});

Scenario('Backdated effective date is routed to the underwriter and approved @underwriting', async ({ I }) => {
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

Scenario('Issue a current dated new policy with optional details for insured', async ({ I }) => {
  await I.getAutoGraystoneData({
    numberOfInsured: '1',
    Insured: { 
        NamedInsured1: { 
            firstName: 'Joe', 
            lastName: 'Biden', 
            dateOfBirth: '1990-01-01',
            gender: 'Male',
            email: 'joe.biden@example.com',
            phone: '536478',
            address: 'Papinin 227',
            city: 'New York',
            state: 'Florida',
            zip: '45027',
            isPrimaryInsured: true
        } 
    },
  });

  await I.executeFlow('New Submission');

  const viewPolicy = await I.usePage('View Policy');
  assert.strictEqual(await viewPolicy.grabSectionCount('Drivers'), 1);
  assert.strictEqual(await viewPolicy.grabSectionCount('Vehicles'), 1);
});

Scenario('Issue a current dated new policy with optional details for drivers', async ({ I }) => {
  await I.getAutoGraystoneData({
    numberOfDrivers: '1',
    Drivers: { 
        Driver1: { 
            firstName: 'John', 
            lastName: 'Wick',
            dateOfBirth: '1989-01-08',
            gender: 'Male',
            licenseNumber: 9087867562,
            licenseState: 'NY',
            yearsLicensed: '6',
            accidents: '2',
            violations: '1',
            relationshipToInsured: 'Child' 
        } 
    },
  });

  await I.executeFlow('New Submission');

  const viewPolicy = await I.usePage('View Policy');
  assert.strictEqual(await viewPolicy.grabSectionCount('Drivers'), 1);
  assert.strictEqual(await viewPolicy.grabSectionCount('Vehicles'), 1);
});

Scenario('Issue a current dated new policy with optional details for vehicles', async ({ I }) => {
  await I.getAutoGraystoneData({
    numberOfVehicles: '1',
    Vehicles: { 
        Vehicle1: { 
            vin: 'VIN67892GHUT623',
            make: 'Toyota', 
            model: 'Camry',
            ownership: 'Rented',
            usage: 'Pleasure',
            annualMileage: '6474',
            costNew: '5688',
            primaryDriver: '1' 
        } 
    },
  });

  await I.executeFlow('New Submission');

  const viewPolicy = await I.usePage('View Policy');
  assert.strictEqual(await viewPolicy.grabSectionCount('Drivers'), 1);
  assert.strictEqual(await viewPolicy.grabSectionCount('Vehicles'), 1);
});

Scenario('Issue a current dated new policy with all coverages', async ({ I }) => {
  await I.getAutoGraystoneData({
   Coverages: { 
        bodilyInjuryLiability: '50k/100k',
        propertyDamageLiability: '50k',
        uninsuredMotorist: '50k/100k',
        medicalPayments: '10k',
        collision: '250', 
        comprehensive: '250', 
        rentalReimbursement: '$50/day',
        roadSideAssitance: 'true' 
    },
  });

  await I.executeFlow('New Submission');

  const viewPolicy = await I.usePage('View Policy');
  assert.strictEqual(await viewPolicy.grabSectionCount('Drivers'), 1);
  assert.strictEqual(await viewPolicy.grabSectionCount('Vehicles'), 1);
});