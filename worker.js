/* =============================================
   The site is one HTML document with client-side routing, which means
   every URL would otherwise be served with the home page's title and
   description. Crawlers that don't run JavaScript - which includes most
   answer engines - would file all three case studies under one identity.

   This rewrites the head per path on the way out, so each case study
   arrives already describing itself. Everything else is served straight
   from the assets binding.
   ============================================= */

const SITE = 'https://ricardo2s.me';
const IMAGE = `${SITE}/og.jpg`;

/* /works is canonical. The other two are the spellings people reach
   for, redirected rather than duplicated so the index has one URL. */
const ALIASES = {
  '/work': '/works',
  '/projects': '/works',
};

const ROUTES = {
  '/works': {
    title: 'Selected work - Ricardo Dos Santos',
    description:
      'Three design case studies from OneHQ, an enterprise CRM for the ' +
      'insurance industry: a workflow automation builder, a communication hub ' +
      'with a Speed Work mode, and a report builder composing live data.',
  },
  '/cat/onehq-workflow': {
    title: 'Workflow Automation Builder - Ricardo Dos Santos',
    description:
      'Case study: a node-based automation builder that let insurance account ' +
      'managers own their own workflows without going through engineering. 847 ' +
      'automations in the first 90 days. Renaming one trigger moved comprehension ' +
      'from 42% to 89%.',
  },
  '/cat/onehq-comhub': {
    title: 'Work & Communication Hub - Ricardo Dos Santos',
    description:
      'Case study: a persistent workbar and a Speed Work mode for power users at ' +
      'OneHQ. Median time-to-send fell from 47 to 19 seconds and context switches ' +
      'per send from 6.2 to 2.1.',
  },
  '/cat/onehq-reports': {
    title: 'Report Builder - Ricardo Dos Santos',
    description:
      'Case study: replacing a manual slides-and-exports process with a canvas ' +
      'that composes reports from live data, with freeze-dated snapshots and ' +
      'scheduled delivery. Monthly prep fell from 4h 28m to 22 minutes.',
  },
};

/** Rewrites the content attribute of whichever meta tags it is bound to. */
class SetContent {
  constructor(value) { this.value = value; }
  element(el) { el.setAttribute('content', this.value); }
}

class SetText {
  constructor(value) { this.value = value; }
  element(el) { el.setInnerContent(this.value); }
}

class SetHref {
  constructor(value) { this.value = value; }
  element(el) { el.setAttribute('href', this.value); }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    const alias = ALIASES[path];
    if (alias) {
      return Response.redirect(new URL(alias + url.search, url.origin).toString(), 301);
    }

    const res = await env.ASSETS.fetch(request);

    const route = ROUTES[path];
    if (!route) return res;

    // Only ever touch HTML, and never an error response.
    const type = res.headers.get('content-type') || '';
    if (!res.ok || !type.includes('text/html')) return res;

    const canonical = SITE + path;

    return new HTMLRewriter()
      .on('title', new SetText(route.title))
      .on('meta[name="description"]', new SetContent(route.description))
      .on('meta[property="og:title"]', new SetContent(route.title))
      .on('meta[property="og:description"]', new SetContent(route.description))
      .on('meta[property="og:url"]', new SetContent(canonical))
      .on('meta[property="og:type"]', new SetContent('article'))
      .on('meta[property="og:image"]', new SetContent(IMAGE))
      .on('meta[name="twitter:title"]', new SetContent(route.title))
      .on('meta[name="twitter:description"]', new SetContent(route.description))
      .on('link[rel="canonical"]', new SetHref(canonical))
      .transform(res);
  },
};
