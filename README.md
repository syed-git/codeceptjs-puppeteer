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
helpers/GrayStoneHelper     test data: I.getAutoGraystoneData(partialJson)  ->  POST auto-graystone-data /getAutoGraystoneData
plugins/htmlDashboard.js    HTML execution dashboard -> output/dashboard/index.html
```

## Setup

```bash
npm install
npm run install:firefox   # optional, only if you want BROWSER=firefox
```

Test data is served by the [auto-graystone-data](https://github.com/syed-git/auto-graystone-data) REST API.
`uat1` points at the Render deployment (`https://auto-graystone-data.onrender.com`), `uat2` at a local instance
(`http://localhost:4000`). To run it locally:

```bash
git clone https://github.com/syed-git/auto-graystone-data.git
cd auto-graystone-data && npm install && npm start     # -> http://localhost:4000/getAutoGraystoneData
```

## Running tests

All commands go through `npm test` (= `node scripts/run.js`), which understands `--tags`, `--headed`, `--env`,
`--browser`, `--data-api` and `--workers` and forwards everything else to `codeceptjs run --steps`.

| Setting  | Env variable | CLI flag                  | Values                | Default  |
| -------- | ------------ | ------------------------- | --------------------- | -------- |
| Env      | `ENV`        | `--env uat2`              | `uat1`, `uat2`, ...   | `uat1`   |
| Browser  | `BROWSER`    | `--browser firefox`       | `chrome`, `firefox`   | `chrome` |
| Headless | `HEADLESS`   | `--headed` / `--headless` | `true`, `false`       | `true`   |
| Tags     | -            | `--tags "@smoke"`         | any tag in a title    | all      |
| Data API | `DATA_API_URL` | `--data-api <url>`      | auto-graystone-data service URL | `dataApiUrl` of the env file |

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

Each environment is a JSON file in `config/env/` (`uat1.json`, `uat2.json`, ...) holding the PolicyCenter base URL
(`baseUrl`), the auto-graystone-data service URL (`dataApiUrl`, overridable with `DATA_API_URL` / `--data-api`) and
user credentials (`accountExecutive`, `underwriter`). Add a new file and select it with `ENV=<name>`.

```json
{
  "baseUrl": "https://personal-auto-policy-center.onrender.com/",
  "dataApiUrl": "https://auto-graystone-data.onrender.com",
  "users": { "accountExecutive": { "username": "aexec", "password": "gw123" }, "underwriter": { "username": "uwriter", "password": "gw123" } }
}
```

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

`await I.getAutoGraystoneData(partial)` POSTs `partial` to the **auto-graystone-data** REST API
(`<dataApiUrl>/getAutoGraystoneData`, see [syed-git/auto-graystone-data](https://github.com/syed-git/auto-graystone-data)),
stores the completed data set for the current test (the pages read it from there) and returns it.

```js
const data = await I.getAutoGraystoneData({
  effectiveDate: '09-20-2026',
  numberOfDrivers: '2',
  Drivers: { Driver1: { firstName: 'John', lastName: 'Wick', accidents: '2' } },
  Coverages: { collision: '250' },          // normalised by the Coverages page to "$250 ded"
});
// data.Drivers.Driver2 was generated, data.Insured.NamedInsured1 / data.Vehicles.Vehicle1 too
```

What the API returns (the same rules apply when you call it with curl):

* **No input** → `numberOfInsured`, `numberOfDrivers`, `numberOfVehicles` = `"1"`, `effectiveDate` = today (`MM-DD-YYYY`).
* **Required fields** are kept when you send them and generated with valid random values otherwise: names,
  date of birth, gender, 10-digit license number, `VIN` + 12 upper-case alphanumerics, year/make/model,
  `ownership` (`Owned` / `Leased` / `Rented`).
* **Optional fields are never generated** - they are returned only if you send them:
  `email, phone, address, city, state, zip` (insured), `licenseState, yearsLicensed, accidents, violations`
  (driver), `usage, annualMileage, costNew, primaryDriver` (vehicle), `uninsuredMotorist, medicalPayments,
  comprehensive, rentalReimbursement, roadSideAssitance` (coverages), the whole `Cancellation` object.
* **Defaults**: `relationshipToInsured` = `Insured`; `Coverages.bodilyInjuryLiability` = `50k/100k`,
  `propertyDamageLiability` = `50k`, `collision` = `$250 ded`.
* `isPrimaryInsured` is `"true"` for `NamedInsured1` and `"false"` for every other insured, whatever you send.
* Counts drive how many `Insured.NamedInsuredN`, `Drivers.DriverN`, `Vehicles.VehicleN` records exist (default: the
  number of records you supplied, else 1); `primaryDriver: "2"` resolves to `Driver2`.
* Values you send are validated (dates, option lists, numeric fields, VIN format, counts 1-10...). Invalid input
  makes `I.getAutoGraystoneData` throw a `GraystoneApiError` whose message lists every problem, e.g.
  `AutoGraystone data API answered 400 - Invalid request body (Vehicles.Vehicle1.vin: "123" must be 15-17 alphanumeric characters starting with VIN)`.
  An unreachable service or a 5xx answer is retried (Render free instances take ~30 s to wake up) and then
  reported with the URL that was called.

Every supported key with sample values: `data/autoGraystoneTemplate.json`. Other helpers: `grabAutoGraystoneData()`,
`grabAutoGraystoneTemplate()`, `setGraystoneValue(path, value)` / `setGraystoneRelativeDate(path, days)` (values set
before `getAutoGraystoneData` are sent along with the input), `grabGraystoneValue(path)`.
`getAutoGraystoneData(partial, { store: false })` fetches without touching the current test data.

Helper configuration (`codecept.conf.js`): `environment` (provides `dataApiUrl`), `timeout` (ms per request,
default 30000) and `retries` (default 2).

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
2. **Build tests** - `npm run test:unit` (node:test unit tests for the data API client / GrayStoneHelper, flows
   and dashboard), then starts a local auto-graystone-data service (`DATA_API_URL=http://localhost:4000`) and runs
   `npm run test:build` headless.
3. **Smoke tests** - same local data service, `npm run test:smoke` headless.

Run the same checks locally: `npm run lint && npm run test:unit && npm run test:build && npm run test:smoke`
(with the data API running locally: `ENV=uat2` or `--data-api http://localhost:4000`).

## Layout

```
.github/workflows/ci.yml   eslint -> build tests -> smoke tests
codecept.conf.js           CodeceptJS config (Puppeteer + helpers + plugins)
config/environment.js      ENV / BROWSER / HEADLESS / DATA_API_URL resolution
config/env/*.json          per-environment URLs (PolicyCenter, data API) and users
data/                      autoGraystoneTemplate.json (reference data set)
flows/flows.js             flow -> ordered page names
helpers/                   PolicyCenterHelper, PageInteractionHelper, PageValidationHelper, GrayStoneHelper
pages/                     BasePage + one class per PolicyCenter page
plugins/htmlDashboard.js   HTML execution dashboard
scripts/run.js             npm test runner (--tags/--headed/--env/--browser/--data-api/--workers)
selectors/                 one locator file per page + common builders
support/                   GlobalData store, auto-graystone-data API client, normalisers, dates, logger
tests/*_test.js            scenarios (tags in titles)
unit/*.test.js             node:test unit tests (no browser)
output/                    dashboard + screenshots (git-ignored)
```
