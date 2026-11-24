'use strict';

const crypto = require('crypto');

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const TABLE = 'bellaj_inquiries';
const ADMIN_PIN = process.env.ADMIN_PIN || '0000';
const COOKIE_NAME = 'bellaj_admin';
const COOKIE_MAX_AGE = 60 * 60 * 12; // 12시간

function secret() {
  return process.env.ADMIN_SECRET || 'bellaj-wed-local-secret';
}

function sign(value) {
  return crypto.createHmac('sha256', secret()).update(value).digest('hex');
}

function issueToken() {
  return sign('admin:' + ADMIN_PIN);
}

function checkToken(token) {
  if (!token) return false;
  const expected = issueToken();
  const a = Buffer.from(String(token));
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function readCookie(req, name) {
  const raw = req.headers.cookie || '';
  const parts = raw.split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return '';
}

function isAdmin(req) {
  return checkToken(readCookie(req, COOKIE_NAME));
}

function cookieHeader(token) {
  const base =
    COOKIE_NAME + '=' + encodeURIComponent(token) +
    '; Path=/; HttpOnly; SameSite=Strict; Max-Age=' + COOKIE_MAX_AGE;
  return base + '; Secure';
}

function clearCookieHeader() {
  return COOKIE_NAME + '=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0; Secure';
}

function checkPin(pin) {
  if (typeof pin !== 'string') return false;
  const a = Buffer.from(pin.trim());
  const b = Buffer.from(ADMIN_PIN);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function hasDb() {
  return Boolean(SUPABASE_URL && SERVICE_KEY);
}

async function db(path, options) {
  const res = await fetch(SUPABASE_URL + '/rest/v1/' + TABLE + (path || ''), {
    ...options,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: 'Bearer ' + SERVICE_KEY,
      'Content-Type': 'application/json',
      ...(options && options.headers ? options.headers : {})
    }
  });
  const text = await res.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch (e) {
      body = text;
    }
  }
  if (!res.ok) {
    const err = new Error('supabase_error');
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

async function insertInquiry(row) {
  await db('', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(row)
  });
}

async function listInquiries() {
  const rows = await db('?select=id,created_at,name,phone,visit_when,plan,status&order=created_at.desc&limit=500');
  return Array.isArray(rows) ? rows : [];
}

async function updateStatus(id, status) {
  const rows = await db('?id=eq.' + encodeURIComponent(id), {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ status: status })
  });
  return Array.isArray(rows) ? rows[0] : null;
}

async function deleteInquiry(id) {
  await db('?id=eq.' + encodeURIComponent(id), { method: 'DELETE' });
}

module.exports = {
  hasDb,
  insertInquiry,
  listInquiries,
  updateStatus,
  deleteInquiry,
  isAdmin,
  issueToken,
  cookieHeader,
  clearCookieHeader,
  checkPin,
  COOKIE_NAME
};
