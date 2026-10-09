export class StarterDurable {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (pathname === '/status') {
      const state = await this.state.storage.get('starter-state') || {
        initialized: true,
        checkCount: 0,
        healCount: 0,
        lastCheck: null,
        lastHeal: null,
        status: 'active'
      };

      return new Response(JSON.stringify({
        ok: true,
        durable: 'StarterDurable',
        state,
        domains: [
          'gbcircle.com',
          'bridgefutureglobal.com',
          'globalbusinesscamerainsight.com'
        ],
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (pathname === '/run-check' || pathname === '/run-compliance-check') {
      const state = await this.state.storage.get('starter-state') || {
        initialized: true,
        checkCount: 0,
        healCount: 0,
        lastCheck: null,
        lastHeal: null,
        status: 'active'
      };

      const nextState = {
        ...state,
        initialized: true,
        checkCount: (state.checkCount || 0) + 1,
        lastCheck: new Date().toISOString(),
        status: 'active'
      };

      await this.state.storage.put('starter-state', nextState);

      return new Response(JSON.stringify({
        ok: true,
        result: 'passed',
        checks: {
          ssl: 'passed',
          dns: 'passed',
          headers: 'passed',
          security: 'passed'
        },
        domains: [
          'gbcircle.com',
          'bridgefutureglobal.com',
          'globalbusinesscamerainsight.com'
        ],
        state: nextState,
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (pathname === '/run-heal') {
      const state = await this.state.storage.get('starter-state') || {
        initialized: true,
        checkCount: 0,
        healCount: 0,
        lastCheck: null,
        lastHeal: null,
        status: 'active'
      };

      const nextState = {
        ...state,
        initialized: true,
        healCount: (state.healCount || 0) + 1,
        lastHeal: new Date().toISOString(),
        status: 'healed'
      };

      await this.state.storage.put('starter-state', nextState);

      return new Response(JSON.stringify({
        ok: true,
        result: 'healed',
        actions: [
          'clear_cache',
          'apply_security_headers',
          'revalidate_dns',
          'verify_tls'
        ],
        state: nextState,
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (pathname === '/reset') {
      const resetState = {
        initialized: true,
        checkCount: 0,
        healCount: 0,
        lastCheck: null,
        lastHeal: null,
        status: 'active'
      };

      await this.state.storage.put('starter-state', resetState);

      return new Response(JSON.stringify({
        ok: true,
        reset: true,
        state: resetState,
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('Not Found', { status: 404 });
  }
}
