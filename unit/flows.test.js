import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FLOWS, resolveFlowName, resolvePageName } from '../flows/flows.js';
import { PAGES } from '../pages/index.js';

test('every page referenced by a flow has a page class', () => {
  for (const [flow, pages] of Object.entries(FLOWS)) {
    for (const page of pages) assert.ok(PAGES[page], `${flow}: page class for '${page}' is missing`);
  }
});

test('every flow starts on the Home Page and ends on View Policy', () => {
  for (const pages of Object.values(FLOWS)) {
    assert.equal(pages[0], 'Home Page');
    assert.equal(pages.at(-1), 'View Policy');
  }
});

test('flow and page names are resolved loosely', () => {
  assert.equal(resolveFlowName('new submission'), 'New Submission');
  assert.equal(resolveFlowName('PolicyChange'), 'Policy Change');
  assert.equal(resolvePageName('New Submission', 'risk analysis'), 'Risk Analysis');
  assert.throws(() => resolveFlowName('Renewal'), /Unknown flow/);
  assert.throws(() => resolvePageName('Cancellation', 'Drivers'), /not part of/);
});
