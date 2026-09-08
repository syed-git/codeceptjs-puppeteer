# codeceptjs-puppeteer

CodeceptJS + Puppeteer automation framework for Guidewire PolicyCenter (Personal Auto).
Tests are plain JavaScript (`Feature` / `Scenario`), not Gherkin feature files.

## Setup

```bash
npm install
npm run install:firefox   # optional, only if you want BROWSER=firefox
```

## Running tests

Environment, browser and headless mode are passed from the command line:

| Variable   | Values                 | Default |
| ---------- | ---------------------- | ------- |
| `ENV`      | `uat1`, `uat2`, ...    | `uat1`  |
| `BROWSER`  | `chrome`, `firefox`    | `chrome`|
| `HEADLESS` | `true`, `false`        | `true`  |

```bash
ENV=uat2 BROWSER=firefox HEADLESS=false npx codeceptjs run --steps
npm run test:uat2
npm run test:headed
```

Each environment is a JSON file in `config/env/` (`uat1.json`, `uat2.json`, ...) holding the base URL and
user credentials. Add a new file and select it with `ENV=<name>`.

### Tags

Tags live in the test titles and are selected with `--grep`:

```bash
npm run test:smoke                              # @smoke
npm run test:regression                         # @regression
npx codeceptjs run --grep "@Cancellation"
npx codeceptjs run --grep "@PolicyChange|@NewSubmission"
npx codeceptjs run --grep "@underwriting" --invert
```

Available tags: `@NewSubmission`, `@PolicyChange`, `@Cancellation`, `@smoke`, `@regression`, `@navigator`, `@underwriting`.

## Flows

Flows are defined in `flows/flows.js` as an ordered list of page names:

| Flow             | Pages                                                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `New Submission` | Home Page → Policy Info → Drivers → Vehicles → Coverages → Quote → Risk Analysis → Review → Policy Summary → View Policy |
| `Policy Change`  | same as New Submission (started from an existing policy)                                                               |
| `Cancellation`   | Home Page → Cancel Policy → View Policy                                                                                 |

```js
Feature('New Submission @NewSubmission');

Before(({ I }) => I.loginAs('accountExecutive'));

Scenario('Issue a policy @smoke', async ({ I }) => {
  await I.getAutoGraystoneData({ numberOfDrivers: '1', numberOfVehicles: '1' });
  await I.executeFlow('New Submission');            // fills every page in order
  assert.strictEqual(await I.grabPolicyStatus(), 'In Force');
});

Scenario('Navigator @navigator', async ({ I }) => {
  await I.getAutoGraystoneData();
  await I.createFlow('New Submission');             // starts the flow (Home Page)
  await I.navigateTo('Coverages');                  // fills pages up to and including the page before Coverages
  const coverages = await I.usePage('Coverages');   // page object for ad-hoc actions
  await coverages.fillOutPage(await I.grabAutoGraystoneData());
  await coverages.setCoverage('collision', '$1,000 ded');
  await I.clickOnNext();
  await I.finishFlow();                             // fills the leftover pages
});

Scenario('Cancel', async ({ I }) => {
  await I.executeFlow('Cancellation', { policyNumber: 'PA-100001' });
});
```

`PolicyCenterHelper` methods: `loginAs(role)`, `logout()`, `executeFlow(flow, options)`, `createFlow(flow, options)`,
`navigateTo(page)`, `finishFlow()`, `fillOutCurrentPage()`, `fillOutPageAndContinue()`, `clickOnNext()`,
`usePage(page)`, `seePage(page)`, `approveUnderwritingIssues()`, `grabPolicyNumber()`, `grabSubmissionNumber()`,
`grabPolicyStatus()`, `grabCurrentPage()`, `grabCurrentFlow()`.

Flow options: `policyNumber` (Policy Change / Cancellation target, defaults to the last issued policy),
`changeEffectiveDate`, `autoApproveUnderwritingIssues` (default `true`: blocking UW issues are submitted, approved as
the underwriter, then the flow resumes as the original user).

## Pages

Every PolicyCenter page is a class in `pages/` extending `BasePage` and implementing the contract:

```js
static pageName = 'Drivers';
async fillOutPage(data, ctx) {}
async clickOnNext(ctx) {}
async fillOutPageAndContinue(data, ctx) {}   // inherited
```

Elements are located with Puppeteer (XPath / CSS) through `BasePage` helpers (`button`, `fieldInput`, `fieldSelect`,
`fill`, `fillDate`, `select`, `setChecked`, `waitFor`, ...). Register new pages in `pages/index.js` and add them to a
flow in `flows/flows.js`.

## GrayStone test data

`I.getAutoGraystoneData(partial)` returns the full GrayStone auto data object, keeping every key you supplied and
generating valid random values for missing ones (recursively). Counts drive how many `Insured.NamedInsuredN`,
`Drivers.DriverN` and `Vehicles.VehicleN` records exist; `primaryDriver: "2"` resolves to `Driver2`. The result is
stored as the current test data and used by every page.

```js
const data = await I.getAutoGraystoneData({
  effectiveDate: '09-20-2026',
  numberOfDrivers: '2',
  Drivers: { Driver1: { firstName: 'John', lastName: 'Wick', accidents: '2' } },
  Coverages: { collision: '250' },          // normalised to "$250 ded"
});
```

Template with every supported key: `data/autoGraystoneTemplate.json`. Other helpers: `grabAutoGraystoneData()`,
`grabAutoGraystoneTemplate()`, `setGraystoneValue(path, value)`, `grabGraystoneValue(path)`,
`setGraystoneRelativeDate(path, days)`.

## Layout

```
codecept.conf.js        CodeceptJS config (Puppeteer + custom helpers)
config/environment.js   ENV / BROWSER / HEADLESS resolution
config/env/*.json       per-environment URLs and users
flows/flows.js          flow -> ordered page names
helpers/                PolicyCenterHelper, GrayStoneHelper (exposed on `I`)
pages/                  BasePage + one class per PolicyCenter page
support/                GlobalData store, data generator, normalisers, dates, logger
tests/*_test.js         JavaScript scenarios (tags in titles)
output/                 screenshots on failure
```
