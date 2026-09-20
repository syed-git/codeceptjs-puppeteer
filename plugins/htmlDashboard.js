import fs from 'fs';
import os from 'os';
import path from 'path';
import { event, output, container, store } from 'codeceptjs';

/**
 * HTML execution dashboard (custom CodeceptJS plugin).
 *
 * Collects every scenario while the run is going (title, feature, tags, duration, steps,
 * error) and, when the run is over, writes a self-contained report:
 *
 *   output/dashboard/index.html     summary cards, environment, filterable scenario table,
 *                                   error + failure screenshot per failed scenario
 *   output/dashboard/report.json    the same data as JSON (for CI / other tooling)
 *   output/dashboard/screenshots/   copies of the *.failed.png files taken by the screenshot plugin
 *
 * Config (codecept.conf.js):
 *   htmlDashboard: { enabled: true, require: './plugins/htmlDashboard.js', reportDir: 'output/dashboard', environment }
 */
export default function htmlDashboard(config = {}) {
  const reportDir = path.resolve(process.cwd(), config.reportDir || 'output/dashboard');
  const environment = config.environment || {};
  const startedAt = new Date();
  const live = new Map(); // test uid -> { steps, startedAt }
  let currentTest = null;

  const stepsOf = (test) => {
    if (!test) return null;
    if (!live.has(test.uid)) live.set(test.uid, { steps: [] });
    return live.get(test.uid);
  };

  event.dispatcher.on(event.test.before, (test) => {
    currentTest = test;
    stepsOf(test).startedAt = Date.now();
  });

  event.dispatcher.on(event.step.started, (step) => {
    const entry = stepsOf(currentTest);
    if (!entry) return;
    const text = typeof step.toString === 'function' ? step.toString() : `${step.actor}.${step.name}`;
    if (entry.steps.length < 500) entry.steps.push(text.trim());
  });

  event.dispatcher.on(event.test.failed, (test, err) => {
    const entry = stepsOf(test || currentTest);
    if (entry && err && !entry.error) entry.error = formatError(err);
  });

  event.dispatcher.on(event.test.finished, (test) => {
    const entry = stepsOf(test);
    if (entry?.startedAt && !entry.duration) entry.duration = Date.now() - entry.startedAt;
  });

  event.dispatcher.on(event.all.result, (result) => {
    if (store.dryRun) return;
    try {
      const report = buildReport(result, live, { environment, startedAt, reportDir });
      writeReport(report, reportDir);
      output.print(`\nHTML dashboard: ${path.join(reportDir, 'index.html')}`);
    } catch (err) {
      output.error(`htmlDashboard: could not write the report - ${err.message}`);
    }
  });
}

/* ------------------------------------------------------------------ */
/* Data                                                                 */
/* ------------------------------------------------------------------ */

function formatError(err) {
  if (!err) return '';
  if (typeof err === 'string') return err;
  const message = (err.inspect ? err.inspect() : err.message || String(err)).split(/\n\s*◯ /)[0];
  return err.stack && !err.inspect ? `${message}\n\n${err.stack.split('\n').slice(1, 8).join('\n')}` : message.trim();
}

function statusOf(test) {
  if (test.state === 'passed' || test.state === 'failed') return test.state;
  if (test.pending || test.state === 'pending' || test.state === 'skipped') return 'skipped';
  return test.err ? 'failed' : 'unknown';
}

function buildReport(result, live, { environment, startedAt, reportDir }) {
  const finishedAt = new Date();
  const screenshotsDir = path.join(reportDir, 'screenshots');
  const seen = new Set();

  const tests = (result?.tests || [])
    .filter((test) => {
      if (seen.has(test.uid)) return false;
      seen.add(test.uid);
      return true;
    })
    .map((test) => {
      const extra = live.get(test.uid) || {};
      const status = statusOf(test);
      const screenshot = status === 'failed' ? copyScreenshot(test.artifacts?.screenshot, screenshotsDir) : null;
      return {
        title: test.title,
        feature: test.parent?.title || '',
        tags: test.tags || [],
        status,
        duration: test.duration || extra.duration || 0,
        error: status === 'failed' ? formatError(test.err) || extra.error || '' : '',
        screenshot,
        steps: extra.steps || [],
        file: test.file ? path.relative(process.cwd(), test.file) : '',
      };
    });

  const stats = {
    total: tests.length,
    passed: tests.filter((t) => t.status === 'passed').length,
    failed: tests.filter((t) => t.status === 'failed').length,
    skipped: tests.filter((t) => t.status === 'skipped').length,
    failedHooks: result?.stats?.failedHooks || 0,
    duration: finishedAt - startedAt,
  };
  stats.passRate = stats.total ? Math.round((stats.passed / stats.total) * 100) : 0;

  const puppeteer = container.helpers('Puppeteer');
  return {
    generatedAt: finishedAt.toISOString(),
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    stats,
    environment: {
      name: environment.name || process.env.ENV || '',
      baseUrl: environment.baseUrl || puppeteer?.options?.url || '',
      dataApiUrl: environment.dataApiUrl || process.env.DATA_API_URL || '',
      browser: environment.browser || puppeteer?.options?.browser || '',
      headless: environment.headless === undefined ? '' : String(environment.headless),
      node: process.version,
      os: `${os.type()} ${os.release()} (${os.arch()})`,
      host: os.hostname(),
      command: process.argv.slice(1).map((a) => path.basename(a)).join(' '),
      ci: process.env.GITHUB_ACTIONS ? `GitHub Actions run ${process.env.GITHUB_RUN_ID || ''}`.trim() : '',
    },
    tests,
  };
}

function copyScreenshot(source, screenshotsDir) {
  if (!source || !fs.existsSync(source)) return null;
  fs.mkdirSync(screenshotsDir, { recursive: true });
  const target = path.join(screenshotsDir, path.basename(source));
  fs.copyFileSync(source, target);
  return path.posix.join('screenshots', path.basename(source));
}

function writeReport(report, reportDir) {
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(path.join(reportDir, 'report.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(reportDir, 'index.html'), renderHtml(report));
}

/* ------------------------------------------------------------------ */
/* HTML                                                                 */
/* ------------------------------------------------------------------ */

const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const fmtDuration = (ms) => {
  if (!ms) return '0s';
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
};

export function renderHtml(report) {
  const { stats, environment, tests } = report;
  const rows = tests
    .map(
      (t, i) => `
      <tr class="row ${t.status}" data-status="${t.status}" data-text="${esc(`${t.feature} ${t.title} ${t.tags.join(' ')}`.toLowerCase())}">
        <td class="num">${i + 1}</td>
        <td><span class="badge ${t.status}">${t.status}</span></td>
        <td>
          <div class="title">${esc(t.title)}</div>
          <div class="meta">${esc(t.feature)}${t.file ? ` · ${esc(t.file)}` : ''}</div>
          ${t.tags.length ? `<div class="tags">${t.tags.map((tag) => `<span class="tag">${esc(tag)}</span>`).join('')}</div>` : ''}
        </td>
        <td class="num">${fmtDuration(t.duration)}</td>
        <td class="num">${t.error || t.steps.length ? `<button class="toggle" data-target="d${i}">details</button>` : ''}</td>
      </tr>
      <tr class="details" id="d${i}" data-status="${t.status}" hidden>
        <td colspan="5">
          ${t.error ? `<h4>Error</h4><pre class="error">${esc(t.error)}</pre>` : ''}
          ${t.screenshot ? `<h4>Screenshot</h4><a href="${esc(t.screenshot)}" target="_blank"><img src="${esc(t.screenshot)}" alt="failure screenshot"></a>` : ''}
          ${t.steps.length ? `<h4>Steps (${t.steps.length})</h4><ol class="steps">${t.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>` : ''}
        </td>
      </tr>`,
    )
    .join('');

  const envRows = Object.entries(environment)
    .filter(([, v]) => v !== '' && v !== undefined)
    .map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`)
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>PolicyCenter automation - execution dashboard</title>
<style>
  :root { --bg:#f4f6fa; --card:#fff; --text:#1f2937; --muted:#6b7280; --line:#e5e7eb; --pass:#16a34a; --fail:#dc2626; --skip:#d97706; --accent:#2563eb; }
  * { box-sizing:border-box; }
  body { margin:0; font:14px/1.5 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; background:var(--bg); color:var(--text); }
  header { background:#111827; color:#fff; padding:20px 32px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; }
  header h1 { margin:0; font-size:20px; } header .sub { color:#9ca3af; font-size:13px; }
  main { padding:24px 32px; max-width:1300px; margin:0 auto; }
  .cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:14px; margin-bottom:20px; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:10px; padding:14px 16px; }
  .card .label { color:var(--muted); font-size:12px; text-transform:uppercase; letter-spacing:.04em; }
  .card .value { font-size:26px; font-weight:600; margin-top:2px; }
  .card.pass .value { color:var(--pass); } .card.fail .value { color:var(--fail); } .card.skip .value { color:var(--skip); }
  .bar { height:8px; border-radius:6px; background:var(--line); overflow:hidden; display:flex; margin-bottom:20px; }
  .bar span { display:block; height:100%; } .bar .p { background:var(--pass);} .bar .f { background:var(--fail);} .bar .s { background:var(--skip);}
  .panel { background:var(--card); border:1px solid var(--line); border-radius:10px; padding:16px 20px; margin-bottom:20px; }
  .panel h2 { margin:0 0 10px; font-size:15px; }
  dl.env { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:6px 24px; margin:0; }
  dl.env div { display:flex; gap:8px; } dl.env dt { color:var(--muted); min-width:80px; } dl.env dd { margin:0; word-break:break-all; }
  .toolbar { display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:12px; }
  .toolbar button { border:1px solid var(--line); background:#fff; border-radius:20px; padding:4px 12px; cursor:pointer; }
  .toolbar button.active { background:var(--accent); color:#fff; border-color:var(--accent); }
  .toolbar input { flex:1; min-width:200px; border:1px solid var(--line); border-radius:6px; padding:6px 10px; }
  table { width:100%; border-collapse:collapse; }
  th, td { text-align:left; padding:10px 8px; border-top:1px solid var(--line); vertical-align:top; }
  th { color:var(--muted); font-size:12px; text-transform:uppercase; letter-spacing:.04em; border-top:none; }
  td.num { white-space:nowrap; color:var(--muted); text-align:right; }
  .title { font-weight:500; } .meta { color:var(--muted); font-size:12px; }
  .tags { margin-top:4px; } .tag { display:inline-block; font-size:11px; background:#eef2ff; color:#3730a3; border-radius:4px; padding:1px 6px; margin-right:4px; }
  .badge { display:inline-block; padding:2px 10px; border-radius:12px; font-size:12px; font-weight:600; color:#fff; text-transform:capitalize; }
  .badge.passed { background:var(--pass);} .badge.failed { background:var(--fail);} .badge.skipped,.badge.unknown { background:var(--skip);}
  .toggle { border:1px solid var(--line); background:#fff; border-radius:6px; padding:2px 8px; cursor:pointer; font-size:12px; }
  tr.details td { background:#fafafa; }
  tr.details h4 { margin:8px 0 4px; font-size:13px; color:var(--muted); }
  pre.error { background:#fef2f2; color:#991b1b; border:1px solid #fecaca; border-radius:8px; padding:10px 12px; white-space:pre-wrap; word-break:break-word; font-size:12px; }
  img { max-width:100%; border:1px solid var(--line); border-radius:8px; }
  ol.steps { margin:0; padding-left:22px; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:12px; color:#374151; max-height:320px; overflow:auto; }
  footer { color:var(--muted); font-size:12px; text-align:center; padding:12px; }
</style>
</head>
<body>
<header>
  <div><h1>PolicyCenter automation - execution dashboard</h1>
  <div class="sub">${esc(new Date(report.finishedAt).toLocaleString())} · ${esc(environment.name)} · ${esc(environment.browser)}${environment.headless === 'false' ? ' (headed)' : ''}</div></div>
  <div class="sub">${stats.failed ? `<span class="badge failed">${stats.failed} failed</span>` : '<span class="badge passed">all passed</span>'}</div>
</header>
<main>
  <section class="cards">
    <div class="card"><div class="label">Scenarios</div><div class="value">${stats.total}</div></div>
    <div class="card pass"><div class="label">Passed</div><div class="value">${stats.passed}</div></div>
    <div class="card fail"><div class="label">Failed</div><div class="value">${stats.failed}</div></div>
    <div class="card skip"><div class="label">Skipped</div><div class="value">${stats.skipped}</div></div>
    <div class="card"><div class="label">Pass rate</div><div class="value">${stats.passRate}%</div></div>
    <div class="card"><div class="label">Duration</div><div class="value">${fmtDuration(stats.duration)}</div></div>
  </section>
  <div class="bar">
    <span class="p" style="width:${stats.total ? (stats.passed / stats.total) * 100 : 0}%"></span>
    <span class="f" style="width:${stats.total ? (stats.failed / stats.total) * 100 : 0}%"></span>
    <span class="s" style="width:${stats.total ? (stats.skipped / stats.total) * 100 : 0}%"></span>
  </div>
  <section class="panel"><h2>Environment</h2><dl class="env">${envRows}</dl></section>
  <section class="panel">
    <h2>Scenarios</h2>
    <div class="toolbar">
      <button class="filter active" data-filter="all">All (${stats.total})</button>
      <button class="filter" data-filter="passed">Passed (${stats.passed})</button>
      <button class="filter" data-filter="failed">Failed (${stats.failed})</button>
      <button class="filter" data-filter="skipped">Skipped (${stats.skipped})</button>
      <input id="search" type="search" placeholder="Filter by feature, scenario or tag...">
    </div>
    <table>
      <thead><tr><th>#</th><th>Status</th><th>Scenario</th><th class="num">Duration</th><th></th></tr></thead>
      <tbody>${rows || '<tr><td colspan="5">No scenarios were executed.</td></tr>'}</tbody>
    </table>
  </section>
</main>
<footer>Generated by plugins/htmlDashboard.js · ${esc(report.generatedAt)}</footer>
<script>
  let filter = 'all';
  const search = document.getElementById('search');
  const apply = () => {
    const q = search.value.trim().toLowerCase();
    document.querySelectorAll('tr.row').forEach((row) => {
      const show = (filter === 'all' || row.dataset.status === filter) && (!q || row.dataset.text.includes(q));
      row.hidden = !show;
      const details = row.nextElementSibling;
      if (!show && details) details.hidden = true;
    });
  };
  document.querySelectorAll('.filter').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach((x) => x.classList.remove('active'));
    b.classList.add('active'); filter = b.dataset.filter; apply();
  }));
  search.addEventListener('input', apply);
  document.querySelectorAll('.toggle').forEach((b) => b.addEventListener('click', () => {
    const d = document.getElementById(b.dataset.target); d.hidden = !d.hidden;
  }));
  document.querySelectorAll('tr.row.failed').forEach((row) => { const d = row.nextElementSibling; if (d) d.hidden = false; });
</script>
</body>
</html>
`;
}
