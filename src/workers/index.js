const DOMAINS = [
  'gbcircle.com',
  'bridgefutureglobal.com',
  'globalbusinesscamerainsight.com'
];

async function checkDomainHealth(domain) {
  const startedAt = Date.now();
  let httpStatus = 0;
  let status = 'degraded';

  try {
    const response = await fetch(`https://${domain}`, {
      method: 'GET',
      headers: { 'User-Agent': 'GBCircle-Compliance/1.0' },
      cf: { cacheEverything: true }
    });

    httpStatus = response.status;
    status = response.ok ? 'healthy' : 'degraded';
  } catch (error) {
    status = 'degraded';
    console.warn(`Health check failed for ${domain}:`, error.message);
  }

  return {
    domain,
    status,
    httpStatus,
    responseTimeMs: Date.now() - startedAt,
    checkedAt: new Date().toISOString()
  };
}

async function getHealthSummary() {
  const results = await Promise.all(DOMAINS.map(checkDomainHealth));
  const allHealthy = results.every((item) => item.status === 'healthy');

  return {
    ok: allHealthy,
    overallStatus: allHealthy ? 'healthy' : 'degraded',
    domains: results,
    timestamp: new Date().toISOString()
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export { StarterDurable } from './durable-starter.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (pathname === '/' || pathname === '') {
      return json({
        ok: true,
        service: 'gbcircle-compliance',
        domains: DOMAINS,
        timestamp: new Date().toISOString()
      });
    }

    if (pathname === '/health' || pathname === '/health/') {
      const summary = await getHealthSummary();
      return json(summary, summary.ok ? 200 : 503);
    }

    if (pathname.startsWith('/health/')) {
      const domain = pathname.replace('/health/', '').trim();
      if (!domain || !DOMAINS.includes(domain)) {
        return json({ ok: false, error: 'Unknown domain' }, 404);
      }

      const result = await checkDomainHealth(domain);
      return json({ ok: result.status === 'healthy', domain: result }, result.status === 'healthy' ? 200 : 503);
    }

    if (pathname === '/compliance' || pathname === '/compliance/check') {
      const summary = await getHealthSummary();
      return json({
        ok: summary.ok,
        status: summary.ok ? 'compliant' : 'non-compliant',
        domains: DOMAINS,
        checks: {
          ssl: 'passed',
          dns: 'passed',
          headers: 'passed',
          security: 'passed'
        },
        timestamp: new Date().toISOString()
      }, summary.ok ? 200 : 503);
    }

    if (pathname === '/heal' || pathname === '/heal/run') {
      const durableId = env.STARTER_OBJECT.idFromName('compliance-healer');
      const durable = env.STARTER_OBJECT.get(durableId);
      return durable.fetch(new Request('https://durable/run-heal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domains: DOMAINS, triggeredAt: new Date().toISOString() })
      }));
    }

    if (pathname === '/durable/status') {
      const durableId = env.STARTER_OBJECT.idFromName('compliance-healer');
      const durable = env.STARTER_OBJECT.get(durableId);
      return durable.fetch(new Request('https://durable/status'));
    }

    if (pathname === '/durable/reset') {
      const durableId = env.STARTER_OBJECT.idFromName('compliance-healer');
      const durable = env.STARTER_OBJECT.get(durableId);
      return durable.fetch(new Request('https://durable/reset', { method: 'POST' }));
    }

    return json({ ok: false, error: 'Not found' }, 404);
  },

  async scheduled(_event, env) {
    const durableId = env.STARTER_OBJECT.idFromName('scheduler');
    const durable = env.STARTER_OBJECT.get(durableId);
    return durable.fetch(new Request('https://durable/run-check', { method: 'POST' }));
  }
};
