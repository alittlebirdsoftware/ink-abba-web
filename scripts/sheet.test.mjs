import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { a1, buildJwt, colLetter, findRows, headerIndex, nextEmptyRow, objectToRow, rowsToObjects, trimRow } from './sheet.mjs';

test('colLetter / a1', () => {
  assert.equal(colLetter(1), 'A'); assert.equal(colLetter(9), 'I'); assert.equal(colLetter(26), 'Z'); assert.equal(colLetter(27), 'AA');
  assert.equal(a1('How to use', 'A1:B'), "'How to use'!A1:B");
});

test('append target: the row after the last occupied cell in the row’s own columns; trailing blanks never written', () => {
  // header, two issues, a blank row inside the table, trailing blank rows
  assert.equal(nextEmptyRow([['ID', 'Issue'], ['ISS-1', 'a'], [], ['ISS-2', 'b'], [], ['', '']]), 5);
  assert.equal(nextEmptyRow([['ID']]), 2);
  assert.equal(nextEmptyRow([]), 1);
  // a side block reaching below the table (Issues' Live counts) pushes the row down — never overwritten
  assert.equal(nextEmptyRow([['ID', 'Live counts'], ['ISS-1', 'Open'], ['', 'Total'], ['', '5']]), 5);
  assert.equal(nextEmptyRow([['ID'], ['', ' ']]), 3, 'a cell holding only a space is still occupied');
  assert.deepEqual(trimRow(['ISS-6', '', 'Open', '', '']), ['ISS-6', '', 'Open']);
  assert.deepEqual(trimRow(['', '']), []);
});

const HEADERS = ['Section', 'Feature', 'Status', "What's left", 'Decision', 'Notes', 'localhost:3210/workspace/leads', 'Release', 'Build notes'];

test('rows ⇄ objects keep the sheet row number and skip blank rows', () => {
  const rows = rowsToObjects(HEADERS, [
    ['A1 · Discovery — Inbound', 'Privilege log', 'Shipped', '', 'Now', '', '', 'R2-δ', 'x'],
    ['', '', '', '', '', '', '', '', ''],
    ['G · Staff workspace', 'One list of every document'],
  ]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0]._row, 2); assert.equal(rows[1]._row, 4);
  assert.equal(rows[1].Status, '');
  const back = objectToRow(HEADERS, { Feature: 'New', Status: 'Shipped', 'Build notes': 'n' });
  assert.deepEqual(back, ['', 'New', 'Shipped', '', '', '', '', '', 'n']);
  assert.throws(() => objectToRow(HEADERS, { Nope: 1 }), /unknown column/);
  assert.equal(headerIndex(HEADERS)['Build notes'], 9);
});

test('findRows: exact match wins alone, else case-insensitive substring', () => {
  const rows = rowsToObjects(HEADERS, [
    ['', 'Record our position and objections for each demand'],
    ['', 'Stop treating "objection" as a coverage outcome'],
    ['', 'objection'],
  ]);
  assert.equal(findRows(rows, 'Feature', 'OBJECTION').length, 1);
  assert.equal(findRows(rows, 'Feature', 'objections for').length, 1);
  assert.equal(findRows(rows, 'Feature', 'objection').length, 1, 'exact wins');
  assert.equal(findRows(rows, 'Feature', 'objectio').length, 3);
});

test('buildJwt signs RS256 claims the token endpoint will accept', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const key = { client_email: 'bot@proj.iam.gserviceaccount.com', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }), token_uri: 'https://oauth2.googleapis.com/token' };
  const { jwt, aud } = buildJwt(key, 1_800_000_000);
  const [h, c, s] = jwt.split('.');
  const dec = (x) => JSON.parse(Buffer.from(x.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
  assert.deepEqual(dec(h), { alg: 'RS256', typ: 'JWT' });
  const claims = dec(c);
  assert.equal(claims.iss, key.client_email); assert.equal(claims.aud, aud);
  assert.equal(claims.scope, 'https://www.googleapis.com/auth/spreadsheets');
  assert.equal(claims.exp - claims.iat, 3600);
  const ok = crypto.verify('RSA-SHA256', Buffer.from(`${h}.${c}`), publicKey, Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64'));
  assert.equal(ok, true);
});

test('authUrl: desktop-client consent URL asks for offline access with PKCE and the sheets scope only', async () => {
  const { authUrl } = await import('./sheet.mjs');
  const u = new URL(authUrl({ client_id: 'cid.apps.googleusercontent.com' }, { redirectUri: 'http://127.0.0.1:5123', state: 'st', codeChallenge: 'ch' }));
  assert.equal(u.origin + u.pathname, 'https://accounts.google.com/o/oauth2/v2/auth');
  const q = Object.fromEntries(u.searchParams);
  assert.equal(q.client_id, 'cid.apps.googleusercontent.com');
  assert.equal(q.redirect_uri, 'http://127.0.0.1:5123');
  assert.equal(q.scope, 'https://www.googleapis.com/auth/spreadsheets');
  assert.equal(q.access_type, 'offline'); assert.equal(q.prompt, 'consent');
  assert.equal(q.code_challenge_method, 'S256'); assert.equal(q.code_challenge, 'ch'); assert.equal(q.state, 'st');
});
