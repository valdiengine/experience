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

  /** @type {Array<{path: string, router: Router}>} */
  #subRouters = [];

  constructor() {}

  /**
   * Register middleware or mount sub-router at path
   * @param {string|Function} pathOrMiddleware
   * @param {Function} [middleware]
   */
  use(pathOrMiddleware, middleware) {
    if (typeof pathOrMiddleware === 'string') {
      const path = pathOrMiddleware;
      const router = middleware;
      if (router && typeof router.handle === 'function') {
        this.#subRouters.push({ path, router });
      }
    } else {
      const fn = pathOrMiddleware;
      const path = '*';
      const existing = this.#middleware.get(path) || [];
      this.#middleware.set(path, [...existing, fn]);
    }
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
   * @param {Function} [next]
   */
  async handle(req, res, next) {
    const match = this.match(req.method, req.pathname);

    if (!match) {
      const subMatch = this.#matchSubRouter(req.method, req.pathname);
      if (subMatch) {
        req.params = subMatch.params;
        const originalPathname = req.pathname;
        req.pathname = subMatch.pathname;
        await subMatch.router.handle(req, res);
        req.pathname = originalPathname;
        return;
      }

      if (next) {
        return next();
      }

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
    const middlewareNext = async () => {
      if (index >= allMiddleware.length) {
        await match.route.handler(req, res, middlewareNext);
        return;
      }
      const middleware = allMiddleware[index++];
      await middleware(req, res, middlewareNext);
    };

    await middlewareNext();
  }

  /**
   * Match sub-router
   * @param {string} method
   * @param {string} pathname
    * @returns {{router: Router, params: Object, pathname: string}|null}
   */
  #matchSubRouter(method, pathname) {
    for (const { path, router } of this.#subRouters) {
      if (pathname.startsWith(path)) {
        const relativePath = pathname.slice(path.length) || '/';
        const match = router.match(method, relativePath);
        if (match) {
          return { router, params: match.params, pathname: relativePath };
        }
      }
    }
    return null;
  }
}
