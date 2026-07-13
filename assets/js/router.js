/**
 * Vereinsverwaltung – einfacher Hash-Router
 */

const routes = new Map();
let fallbackRoute = 'dashboard';

export function registerRoute(name, render) {
  routes.set(name, render);
}

export function setFallbackRoute(name) {
  fallbackRoute = name;
}

export function startRouter() {
  window.addEventListener(
    'hashchange',
    renderCurrentRoute
  );

  renderCurrentRoute();
}

export function navigate(name) {
  const nextHash = '#' + name;

  if (window.location.hash === nextHash) {
    renderCurrentRoute();
    return;
  }

  window.location.hash = nextHash;
}

export function getCurrentRoute() {
  return String(
    window.location.hash || ''
  )
    .replace(/^#/, '')
    .trim() || fallbackRoute;
}

function renderCurrentRoute() {
  const routeName = getCurrentRoute();
  const render =
    routes.get(routeName) ||
    routes.get(fallbackRoute);

  document
    .querySelectorAll('[data-route-link]')
    .forEach(link => {
      link.classList.toggle(
        'is-active',
        link.dataset.routeLink === routeName
      );
    });

  if (typeof render === 'function') {
    render();
  }
}
