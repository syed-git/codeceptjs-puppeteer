import assert from 'assert';
import { relativeDate } from '../../../support/dates.js';

Feature('Verify Underwriting issues @demo');

Before(({ I }) => {
  I.loginAs('accountExecutive');
});

Scenario('Verify underwriting issue is created for 4 or more than 4 violations', async ({ I }) => {
  await I.getAutoGraystoneData({
    Drivers: {
        Driver1: {
            violations: '4'
        }
    }
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
});

Scenario('Verify underwriting issue is created for 4 or more than 4 accidents', async ({ I }) => {
  await I.getAutoGraystoneData({
    Drivers: {
        Driver1: {
            accidents: '4'
        }
    }
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
  await I.finishFlow(); 
});

Scenario('Verify underwriting issue is created for 4 or more than 4 combined accidents & violations', async ({ I }) => {
  await I.getAutoGraystoneData({
    Drivers: {
        Driver1: {
            accidents: '2',
            violations: '2'
        }
    }
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
  await I.finishFlow(); 
});

Scenario('Verify multiple underwriting issue are created back dated policy and more than 4 violations', async ({ I }) => {
  await I.getAutoGraystoneData({
    effectiveDate: relativeDate(-100),
    Drivers: {
        Driver1: {
            violations: '4'
        }
    }
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
  await I.finishFlow(); 
});