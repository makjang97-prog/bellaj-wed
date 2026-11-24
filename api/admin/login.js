'use strict';

const { checkPin, issueToken, cookieHeader } = require('../../lib/db');

const fails = new Map();

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method_not_allowed' });
    return;
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const now = Date.now();
  const recent = (fails.get(ip) || []).filter((t) => now - t < 15 * 60 * 1000);
  if (recent.length >= 10) {
    res.status(429).json({ ok: false, error: 'too_many_attempts' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      body = null;
    }
  }

  if (!checkPin((body && body.pin) || '')) {
    recent.push(now);
    fails.set(ip, recent);
    res.status(401).json({ ok: false, error: 'wrong_pin' });
    return;
  }

  fails.delete(ip);
  res.setHeader('Set-Cookie', cookieHeader(issueToken()));
  res.status(200).json({ ok: true });
};
