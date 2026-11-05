const { passwordOk, sendJson, readBody } = require('./_redis');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });
  if (!process.env.EDIT_PASSWORD) return sendJson(res, 500, { error: 'EDIT_PASSWORD is not set on the server' });
  const body = await readBody(req).catch(() => ({}));
  return passwordOk(body.password) ? sendJson(res, 200, { ok: true }) : sendJson(res, 401, { error: 'Wrong password' });
};
