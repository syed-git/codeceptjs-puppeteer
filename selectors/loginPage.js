import { button, placeholder, layout } from './common.js';

/** Sign-in screen. */
export const loginPage = {
  pageHeading: '//h1[normalize-space()="PolicyCenter"]',
  usernameInput: placeholder('Enter username'),
  passwordInput: placeholder('Enter password'),
  signInButton: button('Sign In'),
  errorMessage: layout.stepError,
  userChip: layout.userChip,
  signOutButton: layout.signOutButton,
};
