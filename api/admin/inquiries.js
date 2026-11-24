'use strict';

const {
  isAdmin,
  hasDb,
  listInquiries,
  updateStatus,
  deleteInquiry
} = require('../../lib/db');

const STATUSES = ['waiting', 'contacted', 'booked'];

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (!isAdmin(req)) {
    res.status(401).json({ ok: false, error: 'unauthorized' });
    return;
  }
  if (!hasDb()) {
    res.status(503).json({ ok: false, error: 'db_not_configured' });
    return;
  }

  try {
    if (req.method === 'GET') {
      const rows = await listInquiries();
      res.status(200).json({ ok: true, rows: rows });
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

    if (req.method === 'PATCH') {
      const id = String(body.id || '');
      const status = String(body.status || '');
      if (!id || STATUSES.indexOf(status) === -1) {
        res.status(400).json({ ok: false, error: 'invalid_request' });
        return;
      }
      const row = await updateStatus(id, status);
      res.status(200).json({ ok: true, row: row });
      return;
    }

    if (req.method === 'DELETE') {
      const id = String(body.id || req.query.id || '');
      if (!id) {
        res.status(400).json({ ok: false, error: 'invalid_request' });
        return;
      }
      await deleteInquiry(id);
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ ok: false, error: 'method_not_allowed' });
  } catch (err) {
    console.error('admin inquiries failed', err.status, JSON.stringify(err.body || {}));
    res.status(500).json({ ok: false, error: 'server_error' });
  }
};
