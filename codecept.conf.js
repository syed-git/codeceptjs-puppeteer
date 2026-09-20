import { environment } from './config/environment.js';

/**
 * CodeceptJS configuration. Runtime switches come from the environment
 * (see config/environment.js and scripts/run.js):
 *
 *   ENV=uat2        -> config/env/uat2.json (base URL, data API URL, users)
 *   BROWSER=firefox -> chrome (default) | firefox
 *   HEADLESS=false  -> shows the browser window (Puppeteer `show: true`)
 *   DATA_API_URL    -> overrides the auto-graystone-data service URL of the environment file
 */
const launchArgs = ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,950'];
const showBrowser = !environment.headless;

export const config = {
  name: 'codeceptjs-puppeteer',
  noGlobals: true,
  tests: './tests/**/*_test.js',
  output: './output',
  timeout: 600,
  helpers: {
    // Browser driver
    Puppeteer: {
      url: environment.baseUrl,
      browser: environment.browser,
      show: showBrowser,
      windowSize: '1400x950',
      waitForTimeout: 15000,
      waitForAction: 150,
      waitForNavigation: 'networkidle0',
      getPageTimeout: 60000,
      restart: true,
      keepCookies: false,
      chrome: {
        args: launchArgs,
        defaultViewport: null,
      },
      firefox: {
        browser: 'firefox',
        args: launchArgs,
        defaultViewport: null,
      },
    },
    // Low-level element actions shared by every page (click, fillField, selectOption...)
    PageInteractionHelper: {
      require: './helpers/PageInteractionHelper.js',
    },
    // Low-level element validations shared by every page (validateElementExists, ...)
    PageValidationHelper: {
      require: './helpers/PageValidationHelper.js',
    },
    // Business flows: loginAs, createFlow, navigateTo, fillOutPage, finishFlow, openTransaction...
    PolicyCenterHelper: {
      require: './helpers/PolicyCenterHelper.js',
      environment,
    },
    // Test data: getAutoGraystoneData (POST <environment.dataApiUrl>/getAutoGraystoneData), setGraystoneValue...
    GrayStoneHelper: {
      require: './helpers/GrayStoneHelper.js',
      environment,
      timeout: 30000,
      retries: 2,
    },
  },
  include: {},
  plugins: {
    // Screenshot of the browser whenever a scenario fails -> output/*.failed.png
    screenshot: { enabled: true, on: 'fail' },
    // Self-contained HTML execution report -> output/dashboard/index.html
    htmlDashboard: {
      enabled: true,
      require: './plugins/htmlDashboard.js',
      reportDir: 'output/dashboard',
      environment,
    },
  },
  mocha: {},
};
