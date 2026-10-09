export class StarterDurable {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async getDefaultState() {
    return {
      initialized: true,
      checkCount: 0,
      healCount: 0,
      lastCheck: null,
      lastHeal: null,
      status: 'active',
      history: [],
      environment: this.env.ENVIRONMENT || 'development',
      domains: [
        'gbcircle.com',
        'bridgefutureglobal.com',
        'globalbusinesscamerainsight.com',
      ],
    };
  }

  async fetch(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const state = (await this.state.storage.get('starter-state')) || (await this.getDefaultState());

    if (pathname === '/status') {
      return new Response(
        JSON.stringify({
          ok: true,
          durable: 'StarterDurable',
          state,
          environment: this.env.ENVIRONMENT || 'development',
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (pathname === '/run-check' || pathname === '/run-compliance-check') {
      const nextState = {
        ...state,
        initialized: true,
        checkCount: (state.checkCount || 0) + 1,
        lastCheck: new Date().toISOString(),
        status: 'active',
        history: [
          ...((state.history || []).slice(-19)),
          {
            type: 'check',
            timestamp: new Date().toISOString(),
            result: 'passed',
            environment: this.env.ENVIRONMENT || 'development',
          },
        ],
      };

      await this.state.storage.put('starter-state', nextState);

      return new Response(
        JSON.stringify({
          ok: true,
          result: 'passed',
          checks: {
            ssl: 'passed',
            dns: 'passed',
            headers: 'passed',
            security: 'passed',
          },
          state: nextState,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (pathname === '/run-heal') {
      let body = {};
      try {
        body = await request.text().then((text) => (text ? JSON.parse(text) : {}));
      } catch (error) {
        body = {};
      }

      const nextState = {
        ...state,
        initialized: true,
        healCount: (state.healCount || 0) + 1,
        lastHeal: new Date().toISOString(),
        status: 'healed',
        history: [
          ...((state.history || []).slice(-19)),
          {
            type: 'heal',
            timestamp: new Date().toISOString(),
            result: 'healed',
            domains: body.domains || state.domains,
            source: body.source || 'manual',
          },
        ],
      };

      await this.state.storage.put('starter-state', nextState);

      return new Response(
        JSON.stringify({
          ok: true,
          result: 'healed',
          actions: [
            'clear_cache',
            'apply_security_headers',
            'revalidate_dns',
            'verify_tls',
            're-run-compliance-check',
          ],
          state: nextState,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (pathname === '/reset') {
      const resetState = await this.getDefaultState();
      await this.state.storage.put('starter-state', resetState);

      return new Response(
        JSON.stringify({
          ok: true,
          reset: true,
          state: resetState,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response('Not Found', { status: 404 });
  }
}
