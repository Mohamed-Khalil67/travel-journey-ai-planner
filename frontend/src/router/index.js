export class Router {
  constructor(routes) {
    this.root = document.getElementById('router-view');
    this.currentView = null;

    // Compile each route pattern once ('/trips/:id' -> /^\/trips\/([^/]+)$/) instead of
    // re-splitting every pattern on every navigation.
    this.routes = routes
      .filter((route) => route.path !== '*')
      .map((route) => {
        const paramNames = [];
        const pattern = route.path
          .split('/')
          .map((part) => {
            if (part.startsWith(':')) {
              paramNames.push(part.slice(1));
              return '([^/]+)';
            }
            return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          })
          .join('/');
        return { ...route, regex: new RegExp(`^${pattern}/?$`), paramNames };
      });
    this.fallback = routes.find((route) => route.path === '*');

    window.addEventListener('popstate', () => this.handleRoute());

    // Event delegation: any element with data-route navigates client-side.
    document.addEventListener('click', (e) => {
      const link = e.target.closest('[data-route]');
      if (!link || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      this.navigate(link.dataset.route);
    });
  }

  init() {
    this.handleRoute();
  }

  navigate(path) {
    if (path !== window.location.pathname + window.location.search) {
      window.history.pushState({}, '', path);
    }
    this.handleRoute();
  }

  match(pathname) {
    for (const route of this.routes) {
      const m = route.regex.exec(pathname);
      if (m) {
        const params = {};
        route.paramNames.forEach((name, i) => {
          params[name] = decodeURIComponent(m[i + 1]);
        });
        return { route, params };
      }
    }
    return this.fallback ? { route: this.fallback, params: {} } : null;
  }

  handleRoute() {
    const path = window.location.pathname;
    this.updateActiveNav(path);

    const matched = this.match(path);
    if (!matched) return;

    // Let the previous view release resources (e.g. abort an in-flight stream)
    this.currentView?.destroy?.();

    const query = Object.fromEntries(new URLSearchParams(window.location.search));
    this.currentView = new matched.route.view({ ...matched.params, query });
    this.root.replaceChildren(this.currentView.render());

    const mainContent = document.querySelector('.main-content');
    if (mainContent) mainContent.scrollTop = 0;
  }

  updateActiveNav(currentPath) {
    document.querySelectorAll('.side-nav .nav-item').forEach((link) => {
      const href = link.dataset.route;
      const active = href === currentPath || (href !== '/' && currentPath.startsWith(href + '/'));
      link.classList.toggle('active', active);
    });
  }
}
