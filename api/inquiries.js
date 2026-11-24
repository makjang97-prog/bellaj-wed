'use strict';

const { hasDb, insertInquiry } = require('../lib/db');

const PLANS = ['촬영+본식', '본식 단독', '드메 토탈', '플러스사이즈 (브라이드앨리 별도 상담)', '상담 후 결정', ''];

/* 간단한 메모리 기반 요청 제한 (같은 IP에서 시간당 30건) */
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const list = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 2000) hits.clear();
  return list.length > 30;
}

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method_not_allowed' });
    return;
  }
  if (!hasDb()) {
    res.status(503).json({ ok: false, error: 'db_not_configured' });
    return;
  }
  if (limited(clientIp(req))) {
    res.status(429).json({ ok: false, error: 'too_many_requests' });
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
  if (!body || typeof body !== 'object') {
    res.status(400).json({ ok: false, error: 'invalid_body' });
    return;
  }

  const name = String(body.name || '').trim().slice(0, 30);
  const phoneRaw = String(body.phone || '').trim().slice(0, 20);
  const phoneDigits = phoneRaw.replace(/\D/g, '');
  const visitWhen = String(body.visit_when || '').trim().slice(0, 60);
  const plan = String(body.plan || '').trim().slice(0, 30);
  const agree = body.agree === true;

  if (name.length < 1) {
    res.status(400).json({ ok: false, error: 'name_required' });
    return;
  }
  if (!/^0\d{8,10}$/.test(phoneDigits)) {
    res.status(400).json({ ok: false, error: 'phone_invalid' });
    return;
  }
  if (!agree) {
    res.status(400).json({ ok: false, error: 'agree_required' });
    return;
  }
  if (plan && PLANS.indexOf(plan) === -1) {
    res.status(400).json({ ok: false, error: 'plan_invalid' });
    return;
  }

  const row = {
    name: name,
    phone: phoneRaw,
    visit_when: visitWhen || null,
    plan: plan || null,
    status: 'waiting'
  };

  try {
    await insertInquiry(row);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('inquiry insert failed', err.status, JSON.stringify(err.body || {}));
    res.status(500).json({ ok: false, error: 'save_failed' });
  }
};
