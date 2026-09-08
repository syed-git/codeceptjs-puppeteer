import BasePage from './BasePage.js';
import { log } from '../support/logger.js';

export default class LoginPage extends BasePage {
  static pageName = 'Login';

  usernameInput = this.placeholder('Enter username');
  passwordInput = this.placeholder('Enter password');
  signInButton = this.button('Sign In');
  errorMessage = '//div[contains(@class,"form-error")]';
  signOutButton = '//button[@title="Sign out"]';
  userChip = '//div[contains(@class,"user-chip")]';

  get pageHeading() {
    return '//h1[normalize-space()="PolicyCenter"]';
  }

  async login(username, password) {
    await this.waitForPage();
    await this.fill(this.usernameInput, username);
    await this.fill(this.passwordInput, password);
    await this.click(this.signInButton);
    await this.waitFor(this.userChip);
    log.info(`'${username}' logged in to Policy Center`);
    await this.goToDashboard(); // the app keeps the previous view (e.g. wizard) across sign-in
  }

  async logout() {
    await this.click(this.signOutButton);
    await this.waitForPage();
    log.info('user logged out from Policy Center');
  }

  async grabError() {
    return this.grabText(this.errorMessage);
  }
}
