const { getRedis, passwordOk, sendJson, readBody, KEY } = require('./_redis');

// Compare-and-set: only write if nobody else saved since the client's version
// (unless force=1). Returns {ok, version}.
const SAVE_SCRIPT = `
local v = tonumber(redis.call('HGET', KEYS[1], 'version') or '0')
if ARGV[3] ~= '1' and v ~= tonumber(ARGV[1]) then return {0, v} end
v = v + 1
redis.call('HSET', KEYS[1], 'state', ARGV[2], 'version', v, 'updatedAt', ARGV[4])
return {1, v}
`;

module.exports = async function handler(req, res) {
  const redis = getRedis();
  if (!redis) return sendJson(res, 500, { error: 'Storage not configured: connect Upstash Redis to this Vercel project.' });

  try {
    if (req.method === 'GET') {
      const url = new URL(req.url, 'http://x');
      const since = Number(url.searchParams.get('since') || -1);
      const [version, updatedAt] = await redis.hmget(KEY, 'version', 'updatedAt').then(r =>
        Array.isArray(r) ? r : r ? [r.version, r.updatedAt] : [null, null]);
      const v = Number(version || 0);
      if (since >= 0 && v === since) return sendJson(res, 200, { version: v, unchanged: true });
      if (!v) return sendJson(res, 200, { version: 0, state: null });
      const raw = await redis.hget(KEY, 'state');
      // Splice the stored JSON in as-is to avoid re-parsing a large document.
      return sendJson(res, 200, `{"version":${v},"updatedAt":${JSON.stringify(updatedAt || '')},"state":${raw || 'null'}}`);
    }

    if (req.method === 'PUT') {
      if (!passwordOk(req.headers['x-edit-password'])) return sendJson(res, 401, { error: 'Wrong or missing edit password' });
      const body = await readBody(req);
      const st = body && body.state;
      if (!st || typeof st !== 'object' || !Array.isArray(st.tasks) || !st.settings) {
        return sendJson(res, 400, { error: 'Invalid planner state' });
      }
      const result = await redis.eval(SAVE_SCRIPT, [KEY], [
        String(Number(body.baseVersion) || 0),
        JSON.stringify(st),
        body.force ? '1' : '0',
        new Date().toISOString(),
      ]);
      const [ok, version] = result.map(Number);
      if (!ok) return sendJson(res, 409, { error: 'Conflict', version });
      return sendJson(res, 200, { version });
    }

    res.setHeader('Allow', 'GET, PUT');
    return sendJson(res, 405, { error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    return sendJson(res, 500, { error: 'Server error' });
  }
};
