// InkAbba's copy of the shared Google Sheets script (source: family-law
// backend/scripts/tracker-sheet.mjs). The app imports createSheets() from here to keep leads and
// quotes in the InkAbba sheet; the CLI below is for reading and fixing the sheet by hand.
// Changes from the source: INKABBA_* env vars and ~/.config/inkabba/sheet.json; Leads/ID CLI
// defaults; a refresh token can be passed in the config (cfg.refreshToken, for servers with no
// token file); the access token is renewed before it expires and once on a 401, because the app
// is long-running; values() can return unformatted numbers; append reads back unformatted and
// compares numbers numerically.
//
// Auth, no deps either way (node:crypto + fetch), config outside the repo in
// ~/.config/inkabba/sheet.json { "spreadsheetId": "…" } (env INKABBA_SHEET_ID wins):
//   · OAuth desktop client (the default — the org policy forbids service-account keys):
//     ~/.config/legalflow/oauth-client.json = the "Desktop app" client JSON from Google Cloud;
//     `auth` runs the one-time consent in the browser and stores the refresh token at
//     ~/.config/legalflow/oauth-token.json (mode 600). Acts as the person who consented, so
//     the sheet needs no sharing. Scope: spreadsheets only.
//   · Service-account key (if the policy is ever lifted): ~/.config/legalflow/sheets-service-account.json,
//     or INKABBA_SHEETS_KEY; the sheet must then be shared with client_email as Editor.
//
// Concurrency posture: every write locates its row by TEXT at write time (never a row number
// remembered from an earlier read), and each cell write is one Sheets batchUpdate — so people
// editing the sheet at the same time are never overwritten wholesale. An append is written at
// an EXPLICIT row: the first row after the last non-empty cell in the row's own columns,
// resolved at write time and read back afterwards. It never calls values.append, whose table
// detection wrote Issues rows beside the Live-counts block (P:AE) and inserted mid-table on
// Triage (2026-09-10). Row numbers stay citable because nothing is inserted mid-table (the
// Estimates tab looks Triage up by row number).
//
// Usage:
//   node scripts/sheet.mjs auth                 one-time browser consent (OAuth mode)
//   node scripts/sheet.mjs tabs
//   node scripts/sheet.mjs pull  [--tab Triage] [--out rows.json]
//   node scripts/sheet.mjs find  "<text>" [--tab Triage] [--col Feature]
//   node scripts/sheet.mjs append --tab Triage --json '{"Section":"…","Feature":"…","Status":"Shipped"}'
//   node scripts/sheet.mjs update --match "<feature text>" --json '{"Status":"Shipped","Release":"R14"}' [--tab Triage] [--col Feature]
//   node scripts/sheet.mjs set   --tab "How to use" --cell B20 --value "…"
//   node scripts/sheet.mjs insert-after --tab "How to use" --match "R13 =" --json '["","R14 = …"]'
//   --dry-run on any write prints the exact cells it would change and stops.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawn } from 'node:child_process';
import http from 'node:http';
import crypto from 'node:crypto';

// ---- pure helpers (tested in tracker-sheet.test.mjs) -------------------------------------

/** 1 → A, 26 → Z, 27 → AA. */
export function colLetter(n) {
  let s = '';
  for (let x = n; x > 0; x = Math.floor((x - 1) / 26)) s = String.fromCharCode(65 + ((x - 1) % 26)) + s;
  return s;
}

/** A1 range for a tab, quoting the title (tabs with spaces need it). */
export function a1(tab, ref) {
  return `'${String(tab).replace(/'/g, "''")}'!${ref}`;
}

/** Header cells → { name: 1-based column index }; blanks and repeats are skipped. */
export function headerIndex(headers) {
  const out = {};
  headers.forEach((h, i) => {
    const name = h == null ? '' : String(h).trim();
    if (name && !(name in out)) out[name] = i + 1;
  });
  return out;
}

/** Value rows → objects keyed by header, each with `_row` (the sheet's 1-based row number). */
export function rowsToObjects(headers, values, firstRow = 2) {
  const idx = headerIndex(headers);
  return values.map((r, i) => {
    const o = { _row: firstRow + i };
    for (const [name, col] of Object.entries(idx)) o[name] = r[col - 1] ?? '';
    return o;
  }).filter((o) => Object.entries(o).some(([k, v]) => k !== '_row' && String(v).trim() !== ''));
}

/** Object keyed by header → one value row (unknown keys are an error, never silently dropped). */
export function objectToRow(headers, obj) {
  const idx = headerIndex(headers);
  const unknown = Object.keys(obj).filter((k) => !(k in idx));
  if (unknown.length) throw new Error(`unknown column(s): ${unknown.join(', ')} — headers are: ${Object.keys(idx).join(' | ')}`);
  const width = Math.max(...Object.values(idx));
  const row = Array.from({ length: width }, () => '');
  for (const [k, v] of Object.entries(obj)) row[idx[k] - 1] = v == null ? '' : String(v);
  return row;
}

/** Rows whose `col` contains `text` (case-insensitive); an exact match, when one exists, wins alone. */
export function findRows(rows, col, text) {
  const needle = String(text).trim().toLowerCase();
  const hay = (r) => String(r[col] ?? '').trim().toLowerCase();
  const exact = rows.filter((r) => hay(r) === needle);
  if (exact.length) return exact;
  return rows.filter((r) => hay(r).includes(needle));
}

/** The 1-based row after the last row holding any non-empty cell (`values` starts at row 1).
 *  Blank rows inside a table don't end it, and a cell holding anything — even a space — is
 *  occupied, so an append never writes over it. */
export function nextEmptyRow(values) {
  let last = 0;
  (values ?? []).forEach((r, i) => { if ((r ?? []).some((c) => String(c ?? '') !== '')) last = i + 1; });
  return last + 1;
}

/** A row without its trailing empty cells, so a write only touches the columns it fills. */
export function trimRow(row) {
  let n = row.length;
  while (n > 0 && String(row[n - 1] ?? '') === '') n--;
  return row.slice(0, n);
}

const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** Service-account JWT for the Sheets scope (RS256, one hour). */
export function buildJwt(key, now = Math.floor(Date.now() / 1000), scope = 'https://www.googleapis.com/auth/spreadsheets') {
  const aud = key.token_uri || 'https://oauth2.googleapis.com/token';
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({ iss: key.client_email, scope, aud, iat: now, exp: now + 3600 }));
  const sig = crypto.sign('RSA-SHA256', Buffer.from(`${header}.${claims}`), key.private_key);
  return { jwt: `${header}.${claims}.${b64url(sig)}`, aud };
}

/** The consent URL for a desktop OAuth client (PKCE S256; offline so a refresh token comes back). */
export function authUrl(client, { redirectUri, state, codeChallenge, scope = SCOPE }) {
  const u = new URL(client.auth_uri || 'https://accounts.google.com/o/oauth2/v2/auth');
  for (const [k, v] of Object.entries({
    client_id: client.client_id, redirect_uri: redirectUri, response_type: 'code', scope,
    access_type: 'offline', prompt: 'consent', state, code_challenge: codeChallenge, code_challenge_method: 'S256',
  })) u.searchParams.set(k, v);
  return u.toString();
}

const SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

// ---- config + auth ------------------------------------------------------------------------

function expandHome(p) { return p && p.startsWith('~') ? join(homedir(), p.slice(1)) : p; }

export function loadConfig(env = process.env, { needSheet = true } = {}) {
  const cfgPath = expandHome(env.INKABBA_SHEET_CONFIG || '~/.config/inkabba/sheet.json');
  const cfg = existsSync(cfgPath) ? JSON.parse(readFileSync(cfgPath, 'utf8')) : {};
  const spreadsheetId = env.INKABBA_SHEET_ID || cfg.spreadsheetId;
  if (needSheet && !spreadsheetId) throw new Error(`no spreadsheetId — put it in ${cfgPath} or INKABBA_SHEET_ID`);
  const keyFile = expandHome(env.INKABBA_SHEETS_KEY || cfg.keyFile || '~/.config/legalflow/sheets-service-account.json');
  const clientFile = expandHome(env.INKABBA_OAUTH_CLIENT || cfg.oauthClient || '~/.config/legalflow/oauth-client.json');
  const tokenFile = expandHome(env.INKABBA_OAUTH_TOKEN || cfg.oauthToken || '~/.config/legalflow/oauth-token.json');
  if (existsSync(keyFile)) {
    const key = JSON.parse(readFileSync(keyFile, 'utf8'));
    if (!key.client_email || !key.private_key) throw new Error(`${keyFile} is not a service-account key (needs client_email + private_key)`);
    return { mode: 'service_account', spreadsheetId, key, cfgPath };
  }
  if (!existsSync(clientFile)) {
    throw new Error(`no credentials: expected the OAuth desktop client JSON at ${clientFile} (or a service-account key at ${keyFile})`);
  }
  const raw = JSON.parse(readFileSync(clientFile, 'utf8'));
  const client = raw.installed || raw.web || raw;
  if (!client.client_id || !client.client_secret) throw new Error(`${clientFile} is not an OAuth client JSON (needs installed.client_id + client_secret)`);
  return { mode: 'oauth', spreadsheetId, client, tokenFile, clientFile, cfgPath };
}

async function tokenPost(uri, params) {
  const res = await fetch(uri, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) throw new Error(`token exchange failed (${res.status}): ${JSON.stringify(body).slice(0, 300)}`);
  return body;
}

/** A fresh access token: `{ access_token, expires_in }`. */
async function accessToken(cfg) {
  if (cfg.mode === 'service_account') {
    const { jwt, aud } = buildJwt(cfg.key);
    return tokenPost(aud, { grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt });
  }
  let refreshToken = cfg.refreshToken;
  if (!refreshToken) {
    if (!existsSync(cfg.tokenFile)) throw new Error(`not authorised yet — run: node scripts/sheet.mjs auth`);
    refreshToken = JSON.parse(readFileSync(cfg.tokenFile, 'utf8')).refresh_token;
  }
  try {
    return await tokenPost(cfg.client.token_uri || 'https://oauth2.googleapis.com/token', {
      grant_type: 'refresh_token', refresh_token: refreshToken,
      client_id: cfg.client.client_id, client_secret: cfg.client.client_secret,
    });
  } catch (e) {
    throw new Error(`${e.message}\nthe stored consent may have been revoked — re-run: node scripts/sheet.mjs auth`);
  }
}

/** One-time browser consent: local loopback receiver + PKCE; stores the refresh token. */
async function runAuth(cfg) {
  if (cfg.mode !== 'oauth') { console.log('service-account mode needs no consent'); return; }
  const verifier = b64url(crypto.randomBytes(32));
  const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
  const state = b64url(crypto.randomBytes(16));
  const code = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const u = new URL(req.url, 'http://127.0.0.1');
      if (u.pathname !== '/') { res.writeHead(404); res.end(); return; }
      const err = u.searchParams.get('error');
      const ok = !err && u.searchParams.get('state') === state && u.searchParams.get('code');
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(ok ? '<p>Authorised — you can close this tab.</p>' : `<p>Authorisation failed: ${err || 'state mismatch'}</p>`);
      server.close();
      ok ? resolve(u.searchParams.get('code')) : reject(new Error(err || 'state mismatch'));
    });
    server.listen(0, '127.0.0.1', () => {
      const redirectUri = `http://127.0.0.1:${server.address().port}`;
      const url = authUrl(cfg.client, { redirectUri, state, codeChallenge: challenge });
      cfg._redirectUri = redirectUri;
      console.log('Open this URL in your browser (it should open on its own) and approve access:\n\n' + url + '\n');
      spawn('open', [url], { stdio: 'ignore', detached: true }).on('error', () => {}).unref();
    });
    setTimeout(() => { server.close(); reject(new Error('timed out waiting for the browser consent (5 minutes)')); }, 5 * 60 * 1000).unref();
  });
  const body = await tokenPost(cfg.client.token_uri || 'https://oauth2.googleapis.com/token', {
    grant_type: 'authorization_code', code, code_verifier: verifier, redirect_uri: cfg._redirectUri,
    client_id: cfg.client.client_id, client_secret: cfg.client.client_secret,
  });
  if (!body.refresh_token) throw new Error('Google returned no refresh token — revoke the app at myaccount.google.com/permissions and run auth again');
  mkdirSync(dirname(cfg.tokenFile), { recursive: true });
  writeFileSync(cfg.tokenFile, JSON.stringify({ refresh_token: body.refresh_token, scope: body.scope, obtainedAt: new Date().toISOString() }, null, 2), { mode: 0o600 });
  console.log(`authorised — refresh token stored at ${cfg.tokenFile}`);
}

export function createSheets(cfg) {
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${cfg.spreadsheetId}`;
  // Access tokens last an hour; a long-running server renews a minute or two early, and once
  // more if Google rejects one anyway.
  let token = null;
  let tokenExpires = 0;
  async function call(path, { method = 'GET', body, query, retried = false, attempt = 0 } = {}) {
    if (!token || Date.now() >= tokenExpires) {
      const fresh = await accessToken(cfg);
      token = fresh.access_token;
      tokenExpires = Date.now() + (Number(fresh.expires_in) || 3600) * 1000 - 120_000;
    }
    const url = new URL(base + path);
    for (const [k, v] of Object.entries(query ?? {})) url.searchParams.set(k, v);
    const res = await fetch(url, {
      method,
      headers: { authorization: `Bearer ${token}`, ...(body ? { 'content-type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
    if (res.status === 401 && !retried) {
      token = null;
      return call(path, { method, body, query, retried: true, attempt });
    }
    // Over the per-minute quota (60 reads and 60 writes per user): back off and try again.
    if ((res.status === 429 || res.status === 503) && attempt < 4) {
      await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 2000 + Math.random() * 1000));
      return call(path, { method, body, query, retried, attempt: attempt + 1 });
    }
    const text = await res.text();
    if (!res.ok) throw new Error(`Sheets ${method} ${path} → ${res.status}: ${text.slice(0, 400)}`);
    return text ? JSON.parse(text) : {};
  }
  const enc = (range) => encodeURIComponent(range);
  return {
    async tabs() {
      const r = await call('', { query: { fields: 'sheets.properties(title,sheetId,gridProperties(rowCount,columnCount))' } });
      return (r.sheets ?? []).map((s) => s.properties);
    },
    /** `render: 'UNFORMATTED_VALUE'` returns numbers, booleans and date serials as stored. */
    async values(tab, ref = 'A1:ZZ', { render } = {}) {
      const r = await call(`/values/${enc(a1(tab, ref))}`, render ? { query: { valueRenderOption: render } } : {});
      return r.values ?? [];
    },
    /** Header row + object rows for one tab. */
    async table(tab) {
      const values = await this.values(tab);
      const headers = values[0] ?? [];
      return { headers, rows: rowsToObjects(headers, values.slice(1)) };
    },
    /** Where an append lands: the first row after the last non-empty cell in the row's own
     *  columns (A..the row's width), resolved now. `cells` is the row without trailing blanks,
     *  so the write never touches a column the row leaves empty (a side block like Live counts). */
    async appendTarget(tab, row) {
      const cells = trimRow(row);
      if (!cells.length) throw new Error('append: the row is empty');
      const rowNumber = nextEmptyRow(await this.values(tab, `A:${colLetter(Math.max(row.length, 1))}`));
      return { rowNumber, range: `A${rowNumber}:${colLetter(cells.length)}${rowNumber}`, cells };
    },
    /** Append by EXPLICIT row (values.update), never values.append — its table detection wrote
     *  Issues rows beside the Live-counts block and inserted mid-table on Triage (2026-09-10).
     *  Grows the grid when the table already fills it, then reads the row back: another writer
     *  landing on the same row between the read and the write is reported, never hidden. */
    async append(tab, row) {
      const { rowNumber, range, cells } = await this.appendTarget(tab, row);
      const props = (await this.tabs()).find((t) => t.title === tab);
      if (!props) throw new Error(`no tab named ${tab}`);
      const have = props.gridProperties?.rowCount ?? 0;
      if (rowNumber > have) await this.raw([{ appendDimension: { sheetId: props.sheetId, dimension: 'ROWS', length: rowNumber - have } }]);
      const r = await call(`/values/${enc(a1(tab, range))}`, { method: 'PUT', query: { valueInputOption: 'RAW' }, body: { values: [cells] } });
      // Read back unformatted, so a number in a currency or date column compares as written.
      const back = (await this.values(tab, range, { render: 'UNFORMATTED_VALUE' }))[0] ?? [];
      const same = (got, want) =>
        typeof want === 'number' ? Math.abs(Number(got) - want) < 1e-6 : String(got ?? '') === String(want);
      if (cells.some((v, i) => !same(back[i], v))) {
        throw new Error(`append: ${a1(tab, range)} does not read back as written — another edit may have landed there; check the tab`);
      }
      // A row written PAST a basic filter's range falls outside it: it cannot be filtered or
      // sorted, and it sits visually adrift below the table. Google extends a filter for a
      // row INSERTED inside the range, and does nothing for one appended after it — so every
      // append since the filter was last set had been silently dropping out of it (found
      // 2026-09-14: Triage's filter was stuck at A1:I237 while the table had reached 249).
      // Extending it here keeps the tool that grows the table responsible for the table.
      await this.extendBasicFilter(tab, rowNumber).catch((e) => {
        // Never fail the append over presentation: the row IS written, and saying so beats
        // throwing after a successful write.
        console.warn(`append: row written, but the filter could not be extended — ${e?.message ?? e}`);
      });
      return { updatedRange: r.updatedRange ?? a1(tab, range), rowNumber };
    },
    /** Grow the tab's basic filter to include `throughRow`, if it has one that stops short.
     *  A no-op on a tab with no filter, and never SHRINKS one. */
    async extendBasicFilter(tab, throughRow) {
      const meta = await call('', { query: { fields: 'sheets(properties(title,sheetId),basicFilter)' } });
      const sheet = (meta.sheets ?? []).find((x) => x.properties?.title === tab);
      const filter = sheet?.basicFilter;
      if (!sheet || !filter?.range) return { extended: false, reason: 'no basic filter' };
      const range = filter.range;
      const end = range.endRowIndex ?? null;
      if (end === null || end >= throughRow) return { extended: false, reason: 'already covers it' };
      await this.raw([{
        setBasicFilter: {
          filter: {
            ...filter,
            range: { ...range, sheetId: sheet.properties.sheetId, endRowIndex: throughRow },
          },
        },
      }]);
      return { extended: true, from: end, to: throughRow };
    },
    async setCells(tab, cells /* [{ ref: 'C5', value }] */) {
      return call('/values:batchUpdate', {
        method: 'POST',
        body: { valueInputOption: 'RAW', data: cells.map((c) => ({ range: a1(tab, c.ref), values: [[c.value]] })) },
      });
    },
    /** Raw spreadsheets.batchUpdate — structural changes (add a tab, formats, validation). */
    async raw(requests) {
      return call(':batchUpdate', { method: 'POST', body: { requests } });
    },
    /** Write a block of values; mode USER_ENTERED lets formulas through (RAW stores text verbatim). */
    async setRange(tab, ref, values, { mode = 'RAW' } = {}) {
      return call(`/values/${enc(a1(tab, ref))}`, { method: 'PUT', query: { valueInputOption: mode }, body: { values } });
    },
    async insertRowBelow(sheetId, rowNumber /* 1-based row the new one goes UNDER */) {
      return call(':batchUpdate', {
        method: 'POST',
        body: { requests: [{ insertDimension: { range: { sheetId, dimension: 'ROWS', startIndex: rowNumber, endIndex: rowNumber + 1 }, inheritFromBefore: true } }] },
      });
    },
  };
}

// ---- CLI ------------------------------------------------------------------------------------

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) out[k] = true; else { out[k] = next; i++; }
    } else out._.push(a);
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0];
  if (!cmd || args.help) {
    console.log(readFileSync(new URL(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//')).map((l) => l.slice(3)).join('\n'));
    return;
  }
  if (cmd === 'auth') { await runAuth(loadConfig(process.env, { needSheet: false })); return; }
  const cfg = loadConfig();
  const sheets = createSheets(cfg);
  const tab = args.tab ?? 'Leads';
  const col = args.col ?? 'ID';
  const dry = args['dry-run'] === true;

  if (cmd === 'tabs') {
    for (const t of await sheets.tabs()) console.log(`${t.title}\t${t.gridProperties?.rowCount}×${t.gridProperties?.columnCount}\tsheetId=${t.sheetId}`);
    return;
  }
  if (cmd === 'pull') {
    const { headers, rows } = await sheets.table(tab);
    if (args.out) { writeFileSync(args.out, JSON.stringify({ tab, headers, rows }, null, 2)); console.log(`wrote ${rows.length} rows → ${args.out}`); }
    else { console.log(headers.join(' | ')); for (const r of rows) console.log(`${r._row}\t${headers.map((h) => String(r[h] ?? '').replace(/\s+/g, ' ').slice(0, 60)).join(' | ')}`); }
    return;
  }
  if (cmd === 'find') {
    const { rows } = await sheets.table(tab);
    const hits = findRows(rows, col, args._[1] ?? '');
    for (const r of hits) console.log(JSON.stringify(r));
    if (!hits.length) { console.error('no match'); process.exitCode = 1; }
    return;
  }
  if (cmd === 'append') {
    const { headers, rows } = await sheets.table(tab);
    const obj = JSON.parse(args.json ?? '{}');
    const row = objectToRow(headers, obj);
    if (obj[col] && findRows(rows, col, obj[col]).some((r) => String(r[col]).trim().toLowerCase() === String(obj[col]).trim().toLowerCase())) {
      throw new Error(`a row with ${col} = ${JSON.stringify(obj[col])} already exists — use update`);
    }
    // the dry run names the exact range the write will use, resolved the same way (and the real
    // write resolves it again, at write time)
    const { range } = await sheets.appendTarget(tab, row);
    console.log(`${dry ? '[dry-run] would write' : 'writing'} ${a1(tab, range)}:`);
    console.log('  ' + headers.map((h, i) => `${h}=${JSON.stringify(row[i] ?? '')}`).filter((s) => !s.endsWith('=""')).join(' | '));
    if (dry) return;
    const r = await sheets.append(tab, row);
    console.log(`appended → ${r.updatedRange}`);
    return;
  }
  if (cmd === 'update') {
    const { headers, rows } = await sheets.table(tab);
    const idx = headerIndex(headers);
    const hits = findRows(rows, col, args.match ?? '');
    if (hits.length !== 1) throw new Error(`--match must hit exactly one row (hit ${hits.length}): ${hits.map((r) => `#${r._row} ${String(r[col]).slice(0, 60)}`).join(' ; ') || 'none'}`);
    const target = hits[0];
    const changes = Object.entries(JSON.parse(args.json ?? '{}')).map(([k, v]) => {
      if (!(k in idx)) throw new Error(`unknown column ${k} — headers are: ${Object.keys(idx).join(' | ')}`);
      return { ref: `${colLetter(idx[k])}${target._row}`, col: k, before: target[k], value: v == null ? '' : String(v) };
    });
    console.log(`${dry ? '[dry-run] would update' : 'updating'} '${tab}' row ${target._row} (${col}: ${String(target[col]).slice(0, 80)}):`);
    for (const c of changes) console.log(`  ${c.ref} ${c.col}: ${JSON.stringify(String(c.before ?? '').slice(0, 60))} → ${JSON.stringify(c.value.slice(0, 60))}`);
    if (dry) return;
    await sheets.setCells(tab, changes);
    console.log('done');
    return;
  }
  if (cmd === 'set') {
    if (!args.cell || args.value === undefined) throw new Error('set needs --cell A1 --value "…"');
    console.log(`${dry ? '[dry-run] would set' : 'setting'} '${tab}'!${args.cell} = ${JSON.stringify(String(args.value).slice(0, 80))}`);
    if (dry) return;
    await sheets.setCells(tab, [{ ref: args.cell, value: String(args.value) }]);
    console.log('done');
    return;
  }
  if (cmd === 'insert-after') {
    const values = await sheets.values(tab);
    const needle = String(args.match ?? '').toLowerCase();
    const hitIdx = values.map((r, i) => ({ i, text: r.map((v) => String(v ?? '')).join(' ').toLowerCase() })).filter((x) => x.text.includes(needle));
    if (hitIdx.length !== 1) throw new Error(`--match must hit exactly one row (hit ${hitIdx.length})`);
    const rowNumber = hitIdx[0].i + 1;
    const newRow = JSON.parse(args.json ?? '[]');
    const props = (await sheets.tabs()).find((t) => t.title === tab);
    if (!props) throw new Error(`no tab named ${tab}`);
    console.log(`${dry ? '[dry-run] would insert' : 'inserting'} a row under '${tab}' row ${rowNumber} (${values[rowNumber - 1].join(' | ').slice(0, 80)}):`);
    console.log('  ' + JSON.stringify(newRow));
    if (dry) return;
    await sheets.insertRowBelow(props.sheetId, rowNumber);
    await sheets.setCells(tab, newRow.map((v, i) => ({ ref: `${colLetter(i + 1)}${rowNumber + 1}`, value: String(v ?? '') })).filter((c) => c.value !== ''));
    console.log('done');
    return;
  }
  throw new Error(`unknown command ${cmd}`);
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
