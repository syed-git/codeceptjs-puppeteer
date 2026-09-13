import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderHtml } from '../plugins/htmlDashboard.js';

const report = {
  generatedAt: '2026-01-01T10:00:00.000Z',
  startedAt: '2026-01-01T09:58:00.000Z',
  finishedAt: '2026-01-01T10:00:00.000Z',
  stats: { total: 2, passed: 1, failed: 1, skipped: 0, failedHooks: 0, duration: 120000, passRate: 50 },
  environment: { name: 'uat2', baseUrl: 'http://localhost:3000/', browser: 'chrome', headless: 'false', node: 'v24' },
  tests: [
    { title: 'Issue a policy', feature: 'New Submission', tags: ['@smoke'], status: 'passed', duration: 60000, error: '', screenshot: null, steps: ['I.loginAs("accountExecutive")'], file: 'tests/a_test.js' },
    { title: 'Cancel <policy>', feature: 'Cancellation', tags: [], status: 'failed', duration: 60000, error: 'Expected "In Force" got "Canceled"', screenshot: 'screenshots/Cancel_policy.failed.png', steps: [], file: '' },
  ],
};

test('dashboard lists every scenario with status, environment and failure screenshot', () => {
  const html = renderHtml(report);
  assert.match(html, /Issue a policy/);
  assert.match(html, /Cancel &lt;policy&gt;/, 'titles are HTML-escaped');
  assert.match(html, /class="badge passed"/);
  assert.match(html, /class="badge failed"/);
  assert.match(html, /screenshots\/Cancel_policy\.failed\.png/);
  assert.match(html, /Expected &quot;In Force&quot; got &quot;Canceled&quot;/);
  assert.match(html, /http:\/\/localhost:3000\//);
  assert.match(html, /\(headed\)/);
  assert.match(html, /1 failed/);
});

test('dashboard copes with an empty run', () => {
  const html = renderHtml({ ...report, stats: { ...report.stats, total: 0, passed: 0, failed: 0 }, tests: [] });
  assert.match(html, /No scenarios were executed/);
  assert.match(html, /all passed/);
});
