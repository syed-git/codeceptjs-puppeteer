import BasePage from './BasePage.js';
import { loginPage } from '../selectors/index.js';
import { log } from '../support/logger.js';

/** Sign-in screen. Not part of a flow; used by I.loginAs() / I.logout(). */
export default class LoginPage extends BasePage {
  static pageName = 'Login';

  get pageHeading() {
    return loginPage.pageHeading;
  }

  async login(username, password) {
    await this.waitForPage();
    await this.ui.fillField(loginPage.usernameInput, username);
    await this.ui.fillField(loginPage.passwordInput, password);
    await this.ui.click(loginPage.signInButton);
    await this.verify.validateElementPresent(loginPage.userChip, `login as '${username}' failed`);
    log.info(`'${username}' logged in to Policy Center`);
    await this.goToDashboard(); // the app keeps the previous view (e.g. wizard) across sign-in
  }

  async isLoggedIn() {
    return this.ui.isElementVisible(loginPage.userChip, 500);
  }

  async logout() {
    await this.ui.click(loginPage.signOutButton);
    await this.waitForPage();
    log.info('user logged out from Policy Center');
  }

  async grabError() {
    return this.ui.grabTextFrom(loginPage.errorMessage);
  }
}
