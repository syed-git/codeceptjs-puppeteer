
Feature('Login Functionality @smoke');

Scenario('Login as account executive', async ({ I }) => {
  await I.loginAs('accountExecutive');
  await I.logout();
});

Scenario('Login as underwriter', async ({ I }) => {
  await I.loginAs('underwriter');
  await I.logout();
});