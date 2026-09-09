import LoginPage from './LoginPage.js';
import HomePage from './HomePage.js';
import PolicyInfoPage from './PolicyInfoPage.js';
import DriversPage from './DriversPage.js';
import VehiclesPage from './VehiclesPage.js';
import CoveragesPage from './CoveragesPage.js';
import QuotePage from './QuotePage.js';
import RiskAnalysisPage from './RiskAnalysisPage.js';
import ReviewPage from './ReviewPage.js';
import PolicySummaryPage from './PolicySummaryPage.js';
import ViewPolicyPage from './ViewPolicyPage.js';
import CancelPolicyPage from './CancelPolicyPage.js';

export {
  LoginPage,
  HomePage,
  PolicyInfoPage,
  DriversPage,
  VehiclesPage,
  CoveragesPage,
  QuotePage,
  RiskAnalysisPage,
  ReviewPage,
  PolicySummaryPage,
  ViewPolicyPage,
  CancelPolicyPage,
};

/** pageName -> page class, so flows can be described with the page names the business uses. */
export const PAGES = Object.fromEntries(
  [
    LoginPage,
    HomePage,
    PolicyInfoPage,
    DriversPage,
    VehiclesPage,
    CoveragesPage,
    QuotePage,
    RiskAnalysisPage,
    ReviewPage,
    PolicySummaryPage,
    ViewPolicyPage,
    CancelPolicyPage,
  ].map((PageClass) => [PageClass.pageName, PageClass]),
);

export function getPageClass(pageName) {
  const PageClass = PAGES[pageName];
  if (!PageClass) {
    throw new Error(`Unknown page "${pageName}". Known pages: ${Object.keys(PAGES).join(', ')}`);
  }
  return PageClass;
}
