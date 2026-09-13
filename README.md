# codeceptjs-puppeteer

CodeceptJS + Puppeteer automation framework for Guidewire PolicyCenter (Personal Auto).
Tests are plain JavaScript (`Feature` / `Scenario`), not Gherkin feature files.

```
tests/*_test.js            scenarios                       ->  I.executeFlow('New Submission')
helpers/PolicyCenterHelper  flows: login, create/finish flow, navigate, open transaction, approve issues
flows/flows.js              flow name -> ordered page names
pages/*Page.js              one class per PolicyCenter page  (fillOutPage / clickOnNext)
selectors/*Page.js          one file per page with its locators
helpers/PageInteraction...  click, fillField, selectOption, checkCheckbox, ... (used by every page)
helpers/PageValidation...   validateElementExists, validateElementContains, ...  (used by every page)
helpers/GrayStoneHelper     test data: I.getAutoGraystoneData(partialJson)
plugins/htmlDashboard.js    HTML execution dashboard -> output/dashboard/index.html
```

## Setup

```bash
npm install
npm run install:firefox   # optional, only if you want BROWSER=firefox
```

## Running tests

All commands go through `npm test` (= `node scripts/run.js`), which understands `--tags`, `--headed`, `--env`,
`--browser` and `--workers` and forwards everything else to `codeceptjs run --steps`.

| Setting  | Env variable | CLI flag                  | Values                | Default  |
| -------- | ------------ | ------------------------- | --------------------- | -------- |
| Env      | `ENV`        | `--env uat2`              | `uat1`, `uat2`, ...   | `uat1`   |
| Browser  | `BROWSER`    | `--browser firefox`       | `chrome`, `firefox`   | `chrome` |
| Headless | `HEADLESS`   | `--headed` / `--headless` | `true`, `false`       | `true`   |
| Tags     | -            | `--tags "@smoke"`         | any tag in a title    | all      |

```powershell
# PowerShell
$env:HEADLESS="false"; npm test -- --tags "@NewSubmission"
$env:ENV="uat2"; $env:HEADLESS="false"; npm test -- --tags "@smoke"
npm test -- --headed --env uat2 --tags "@PolicyChange|@Cancellation"
```

```bash
# bash
ENV=uat2 HEADLESS=false npm test -- --tags "@NewSubmission"
npm run test:headed                 # visible browser, all tests
npm run test:smoke                  # @smoke
npm run test:regression             # @regression
npm test -- --tags "@underwriting" --invert
npm run test:parallel               # 3 workers
```

### Visible browser (`HEADLESS=false`)

`HEADLESS=false` (or `--headed`) starts Puppeteer with `show: true` in a 1400x950 window.
The previous problem was the `--tags` flag: CodeceptJS only knows `--grep`, so `npm run test -- --tags ...` failed
with `unknown option '--tags'` before the browser ever started. `scripts/run.js` now maps `--tags "@A|@B"` to
`--grep "@A|@B"`. If you still see nothing, check that `HEADLESS` is really `false` (`$env:HEADLESS` in PowerShell,
`echo $HEADLESS` in bash) - the dashboard's *Environment* panel also shows the `headless` value the run used.

### Environments

Each environment is a JSON file in `config/env/` (`uat1.json`, `uat2.json`, ...) holding the base URL and user
credentials (`accountExecutive`, `underwriter`). Add a new file and select it with `ENV=<name>`.

### Tags

Tags live in Feature/Scenario titles: `@NewSubmission`, `@PolicyChange`, `@Cancellation`, `@smoke`, `@regression`,
`@navigator`, `@underwriting`. Combine them with `|`: `--tags "@smoke|@navigator"`.

## Flows

Flows are defined in `flows/flows.js` as an ordered list of page names:

| Flow             | Pages                                                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `New Submission` | Home Page → Policy Info → Drivers → Vehicles → Coverages → Quote → Risk Analysis → Review → Policy Summary → View Policy |
| `Policy Change`  | same as New Submission (started from an existing policy)                                                               |
| `Cancellation`   | Home Page → Cancel Policy → View Policy                                                                                 |

### Flow API (`PolicyCenterHelper`, on `I`)

| Method                              | What it does                                                                                              |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `loginAs(role)` / `logout()`        | `accountExecutive` or `underwriter` (aliases `ae`, `uw`). Flows never log in or out on their own.          |
| `executeFlow(flow, options)`        | `createFlow` + `finishFlow`: fills every page from Home Page to View Policy.                               |
| `createFlow(flow, options)`         | Starts the flow (Home Page step) and leaves you on the first wizard page.                                  |
| `finishFlow()`                      | Detects the page currently displayed (reopening the flow's transaction if you are on the dashboard) and fills every page from there to the end. |
| `navigateTo(page)`                  | Fills every page before `page` and stops on it (unfilled).                                                |
| `navigateToPage(page)`              | Only clicks Next until `page` is displayed - nothing is filled.                                            |
| `fillOutPage()`                     | Fills the current page and stays on it. On Risk Analysis: submits blocking issues for UW approval.        |
| `fillOutPageAndContinue()`          | Fills the current page and clicks Next.                                                                   |
| `clickOnNext()`                     | Clicks Next on the current page without filling it.                                                       |
| `openTransaction([number])`         | Searches the dashboard and opens the transaction. Without an argument it uses the number stored for the active flow (New Submission → submission number, Policy Change / Cancellation → policy number) and **returns it**. |
| `grabTransactionNumber()`           | The number `openTransaction()` would use.                                                                 |
| `approveAllIssues()`                | Underwriter: approves every blocking issue on the open Risk Analysis page.                                |
| `rejectSubmission()`                | Underwriter: rejects the open submission.                                                                 |
| `usePage(page)`                     | Returns the page object for ad-hoc actions (`await (await I.usePage('Coverages')).setCoverage(...)`).      |
| `grabPolicyNumber()`, `grabSubmissionNumber()`, `grabPolicyStatus()`, `grabCurrentPage()`, `grabCurrentFlow()`, `seePage(page)` | grabbers |

Flow options: `policyNumber` (Policy Change / Cancellation target, defaults to the last issued policy) and
`changeEffectiveDate` (Policy Change).

```js
Feature('New Submission @NewSubmission');

Before(({ I }) => I.loginAs('accountExecutive'));

Scenario('Issue a policy @smoke', async ({ I }) => {
  await I.getAutoGraystoneData();                   // 1 insured, 1 driver, 1 vehicle, effective today
  await I.executeFlow('New Submission');            // fills every page in order
  assert.strictEqual(await I.grabPolicyStatus(), 'In Force');
});

Scenario('Underwriting round trip @underwriting', async ({ I }) => {
  await I.getAutoGraystoneData({ effectiveDate: relativeDate(-120) });  // backdated -> blocking UW issue
  await I.createFlow('New Submission');
  await I.navigateTo('Risk Analysis');
  await I.fillOutPage();                            // Risk Analysis: submit for underwriter approval
  await I.logout();
  await I.loginAs('underwriter');
  await I.openTransaction();                        // opens the stored submission number, returns it
  await I.approveAllIssues();
  await I.logout();
  await I.loginAs('accountExecutive');
  await I.finishFlow();                             // reopens the submission and fills Risk Analysis -> View Policy
});

Scenario('Change coverages only @navigator', async ({ I }) => {
  await I.createFlow('Policy Change', { policyNumber: 'PA-1000001' });
  await I.navigateToPage('Coverages');              // just clicks Next: the pages already hold the policy data
  const coverages = await I.usePage('Coverages');
  await coverages.setCoverage('collision', '$1,000 ded');
  await I.clickOnNext();
  await I.finishFlow();
});
```

## Pages, selectors and the shared helpers

Every PolicyCenter page is a class in `pages/` extending `BasePage`:

```js
export default class DriversPage extends BasePage {
  static pageName = 'Drivers';
  get pageHeading() { return driversPage.pageHeading; }
  async fillOutPage(data, ctx) { ... }   // fill the page with the test data, stay on it
  async clickOnNext(ctx) { ... }         // move to the next page
}
```

* **Selectors** live in `selectors/<page>Page.js`, one file per page (`selectors/driversPage.js`, ...).
  `selectors/common.js` has the shared builders (`button('Next')`, `fieldInput('First Name')`, `fieldSelect(...)`,
  `radio(...)`, `stepHeading(...)`) and layout locators. Pages only import selectors - no XPath in page code.
* **`PageInteractionHelper`** (`this.ui` in pages, `I.*` in tests): `click`, `clickNth`, `fillField`, `fillDateField`,
  `selectOption`, `checkCheckbox`, `uncheckCheckbox`, `setCheckbox`, `selectRadio`, `uploadFile`, `pressKey`,
  `waitForElement`, `waitForElementHidden`, `isElementVisible`, `isElementPresent`, `isElementEnabled`,
  `isCheckboxChecked`, `grabTextFrom`, `grabTextsFrom`, `grabValueFrom`, `grabAttributeFrom`, `grabElementCount`,
  `grabSelectOptions`, `grabPageUrl`, `scrollIntoView`, `pause`.
* **`PageValidationHelper`** (`this.verify` in pages, `I.*` in tests): `validateElementExists`,
  `validateElementNotExists`, `validateElementPresent` (visible), `validateElementNotPresent`,
  `validateElementContains`, `validateElementNotContains`, `validateElementText`, `validateElementMatches`,
  `validateElementValue`, `validateCheckboxChecked`, `validateCheckboxUnchecked`, `validateElementEnabled`,
  `validateElementDisabled`, `validateElementCount`, `validatePageContains`, `validateUrlContains`, `validateEquals`.

Locators are strings: XPath (`//...`) or CSS. To add a page: create `selectors/<name>Page.js`, `pages/<Name>Page.js`,
register it in `pages/index.js` and add it to a flow in `flows/flows.js`.

## GrayStone test data

`I.getAutoGraystoneData(partial)` builds the data set used by the pages, stores it for the current test and returns it.

* **No input** → `numberOfInsured`, `numberOfDrivers`, `numberOfVehicles` = `1`, `effectiveDate` = today.
* **Required fields** (names, date of birth, gender, license number, VIN, year/make/model/ownership, liability
  coverages) are generated with valid random values when missing.
* **Optional fields are never generated** - they are used only if you pass them:
  `email, phone, address, city, state, zip` (insured), `licenseState, yearsLicensed, accidents, violations,
  relationshipToInsured` (driver), `usage, annualMileage, costNew, primaryDriver` (vehicle),
  `uninsuredMotorist, medicalPayments, comprehensive, collision, rentalReimbursement, roadSideAssitance` (coverages).
* `isPrimaryInsured` is `true` for `NamedInsured1` only.
* Counts drive how many `Insured.NamedInsuredN`, `Drivers.DriverN`, `Vehicles.VehicleN` records exist (or the
  number of records you supplied); `primaryDriver: "2"` resolves to `Driver2`.

```js
const data = await I.getAutoGraystoneData({
  effectiveDate: '09-20-2026',
  numberOfDrivers: '2',
  Drivers: { Driver1: { firstName: 'John', lastName: 'Wick', accidents: '2' } },
  Coverages: { collision: '250' },          // normalised to "$250 ded"
});
```

Every supported key with sample values: `data/autoGraystoneTemplate.json`. Other helpers: `grabAutoGraystoneData()`,
`grabAutoGraystoneTemplate()`, `setGraystoneValue(path, value)`, `grabGraystoneValue(path)`,
`setGraystoneRelativeDate(path, days)`.

## HTML dashboard and screenshots

Every run writes an execution dashboard (`plugins/htmlDashboard.js`):

```
output/dashboard/index.html     summary, environment, filterable scenario table, error + screenshot per failure
output/dashboard/report.json    same data as JSON
output/dashboard/screenshots/   copies of the failure screenshots
output/*.failed.png             screenshots taken by the CodeceptJS screenshot plugin (on failure)
```

## CI (GitHub Actions)

`.github/workflows/ci.yml` runs on every push to `main` and every pull request, in three dependent stages:

1. **ESLint** - `npm run lint`
2. **Build tests** - `npm run test:build` (`codeceptjs dry-run` loads config, helpers, plugins and every test
   without a browser, then `node --test unit/` runs the unit tests for the data generator, flows and dashboard)
3. **Smoke tests** - starts the PolicyCenter replica (`syed-git/personal-auto-policy-center`, port 3000 = `uat2`)
   and runs `npm run test:smoke` headless. The dashboard and screenshots are uploaded as the `smoke-test-report`
   artifact.

Run the same checks locally: `npm run lint && npm run test:build && ENV=uat2 npm run test:smoke`.

## Layout

```
.github/workflows/ci.yml   eslint -> build tests -> smoke tests
codecept.conf.js           CodeceptJS config (Puppeteer + helpers + plugins)
config/environment.js      ENV / BROWSER / HEADLESS resolution
config/env/*.json          per-environment URLs and users
data/                      autoGraystoneTemplate.json (reference data set)
flows/flows.js             flow -> ordered page names
helpers/                   PolicyCenterHelper, PageInteractionHelper, PageValidationHelper, GrayStoneHelper
pages/                     BasePage + one class per PolicyCenter page
plugins/htmlDashboard.js   HTML execution dashboard
scripts/run.js             npm test runner (--tags/--headed/--env/--browser/--workers)
selectors/                 one locator file per page + common builders
support/                   GlobalData store, data generator, normalisers, dates, logger
tests/*_test.js            scenarios (tags in titles)
unit/*.test.js             node:test unit tests (no browser)
output/                    dashboard + screenshots (git-ignored)
```
