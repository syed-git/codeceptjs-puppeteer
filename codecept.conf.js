import { environment } from './config/environment.js';

const launchArgs = ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,950'];

export const config = {
  name: 'codeceptjs-puppeteer',
  noGlobals: true,
  tests: './tests/**/*_test.js',
  output: './output',
  timeout: 600,
  helpers: {
    Puppeteer: {
      url: environment.baseUrl,
      browser: environment.browser,
      show: !environment.headless,
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
    PolicyCenterHelper: {
      require: './helpers/PolicyCenterHelper.js',
      environment,
    },
    GrayStoneHelper: {
      require: './helpers/GrayStoneHelper.js',
    },
  },
  include: {},
  plugins: {
    screenshot: { enabled: true, on: 'fail' },
  },
  mocha: {},
};
