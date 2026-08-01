/**
 * Base Router
 *
 * Lightweight router implementation.
 * Framework-agnostic, can be replaced with Express/Fastify router.
 *
 * P14 - API Layer Foundation
 */

/**
 * @typedef {Object} Route
 * @property {string} method
 * @property {string} path
 * @property {Function} handler
 * @property {Function[]} middleware
 */

export class Router {
  /** @type {Route[]} */
  #routes = [];

  /** @type {Map<string, Function>} */
  #middleware = new Map();

  constructor() {}

  /**
   * Register global middleware
   * @param {Function} middleware
   */
  use(middleware) {
    const path = '*';
    const existing = this.#middleware.get(path) || [];
    this.#middleware.set(path, [...existing, middleware]);
  }

  /**
   * Add GET route
   * @param {string} path
   * @param {Function} handler
   * @param  {...Function} middleware
   */
  get(path, handler, ...middleware) {
    this.addRoute('GET', path, handler, ...middleware);
  }

  /**
   * Add POST route
   * @param {string} path
   * @param {Function} handler
   * @param  {...Function} middleware
   */
  post(path, handler, ...middleware) {
    this.addRoute('POST', path, handler, ...middleware);
  }

  /**
   * Add PUT route
   * @param {string} path
   * @param {Function} handler
   * @param  {...Function} middleware
   */
  put(path, handler, ...middleware) {
    this.addRoute('PUT', path, handler, ...middleware);
  }

  /**
   * Add PATCH route
   * @param {string} path
   * @param {Function} handler
   * @param  {...Function} middleware
   */
  patch(path, handler, ...middleware) {
    this.addRoute('PATCH', path, handler, ...middleware);
  }

  /**
   * Add DELETE route
   * @param {string} path
   * @param {Function} handler
   * @param  {...Function} middleware
   */
  delete(path, handler, ...middleware) {
    this.addRoute('DELETE', path, handler, ...middleware);
  }

  /**
   * Add route
   * @param {string} method
   * @param {string} path
   * @param {Function} handler
   * @param  {...Function} middleware
   */
  addRoute(method, path, handler, ...middleware) {
    this.#routes.push({
      method: method.toUpperCase(),
      path,
      handler,
      middleware,
    });
  }

  /**
   * Match route to request
   * @param {string} method
   * @param {string} pathname
   * @returns {{ route: Route, params: Object }|null}
   */
  match(method, pathname) {
    for (const route of this.#routes) {
      if (route.method !== method.toUpperCase()) continue;

      const match = this.#matchPath(route.path, pathname);
      if (match) {
        return { route, params: match.params };
      }
    }
    return null;
  }

  /**
   * Match path pattern
   * @param {string} pattern
   * @param {string} pathname
   * @returns {{ params: Object }|null}
   */
  #matchPath(pattern, pathname) {
    const patternParts = pattern.split('/').filter(Boolean);
    const pathnameParts = pathname.split('/').filter(Boolean);

    if (patternParts.length !== pathnameParts.length) {
      return null;
    }

    const params = {};

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const pathnamePart = pathnameParts[i];

      if (patternPart.startsWith(':')) {
        params[patternPart.slice(1)] = pathnamePart;
      } else if (patternPart === '*') {
        continue;
      } else if (patternPart !== pathnamePart) {
        return null;
      }
    }

    return { params };
  }

  /**
   * Get all routes
   * @returns {Route[]}
   */
  getRoutes() {
    return [...this.#routes];
  }

  /**
   * Handle request
   * @param {Object} req
   * @param {Object} res
   */
  async handle(req, res) {
    const match = this.match(req.method, req.pathname);

    if (!match) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          type: 'https://api.example.com/errors/not-found',
          title: 'Not Found',
          status: 404,
          detail: `Route ${req.method} ${req.pathname} not found`,
        })
      );
      return;
    }

    req.params = match.params;

    const globalMiddleware = this.#middleware.get('*') || [];
    const routeMiddleware = match.route.middleware;

    const allMiddleware = [...globalMiddleware, ...routeMiddleware];

    let index = 0;
    const next = async () => {
      if (index >= allMiddleware.length) {
        await match.route.handler(req, res, next);
        return;
      }
      const middleware = allMiddleware[index++];
      await middleware(req, res, next);
    };

    await next();
  }
}
