'use strict';

const { clearCookieHeader } = require('../../lib/db');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Set-Cookie', clearCookieHeader());
  res.status(200).json({ ok: true });
};
