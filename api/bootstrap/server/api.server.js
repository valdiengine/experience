/**
 * API Server
 *
 * HTTP server implementation using native Node.js http module.
 * Framework-agnostic - can be replaced with Express, Fastify, etc.
 *
 * P14 - API Layer Foundation
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';

/**
 * @typedef {Object} ServerConfig
 * @property {number} port
 * @property {string} host
 * @property {string} env
 */

/**
 * @typedef {Object} Request
 * @property {string} method
 * @property {string} url
 * @property {Object} headers
 * @property {Object} params
 * @property {Object} query
 * @property {Object} body
 */

export class ApiServer {
  /** @type {ServerConfig} */
  #config;

  /** @type {import('http').Server} */
  #server;

  /** @type {import('../middleware/index.js').Middleware[]} */
  #middleware = [];

  /** @type {Function|null} */
  #requestHandler = null;

  /** @type {boolean} */
  #initialized = false;

  /**
   * @param {ServerConfig} config
   */
  constructor(config) {
    this.#config = config;
  }

  /**
   * Initialize the server
   */
  async initialize() {
    if (this.#initialized) return;

    this.#server = createServer((req, res) => {
      this.#handleRequest(req, res);
    });

    this.#initialized = true;
  }

  /**
   * Register middleware
   * @param {Function} middleware
   */
  use(middleware) {
    this.#middleware.push(middleware);
  }

  /**
   * Set the request handler (typically a router)
   * @param {Function} handler
   */
  setRequestHandler(handler) {
    this.#requestHandler = handler;
  }

  /**
   * Start listening
   * @returns {Promise<void>}
   */
  async start() {
    return new Promise((resolve) => {
      this.#server.listen(this.#config.port, this.#config.host, () => {
        resolve();
      });
    });
  }

  /**
   * Shutdown gracefully
   * @returns {Promise<void>}
   */
  async shutdown() {
    return new Promise((resolve, reject) => {
      this.#server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Handle incoming HTTP request
   * @param {IncomingMessage} req
   * @param {ServerResponse} res
   */
  async #handleRequest(req, res) {
    try {
      const parsed = this.#parseRequest(req);

      let i = 0;
      const next = async () => {
        if (i >= this.#middleware.length) {
          if (this.#requestHandler) {
            await this.#requestHandler(parsed, res);
          }
          return;
        }
        const middleware = this.#middleware[i++];
        await middleware(parsed, res, next);
      };

      await next();
    } catch (error) {
      this.#handleError(error, res);
    }
  }

  /**
   * Parse raw HTTP request into structured format
   * @param {IncomingMessage} req
   * @returns {Request}
   */
  #parseRequest(req) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    let body = null;
    if (req.headers['content-type']?.includes('application/json')) {
      body = this.#parseBody(req);
    }

    return {
      method: req.method,
      url: req.url,
      pathname,
      headers: req.headers,
      params: {},
      query: Object.fromEntries(url.searchParams),
      body,
      raw: req,
    };
  }

  /**
   * Parse request body
   * @param {IncomingMessage} req
   * @returns {Promise<Object|null>}
   */
  #parseBody(req) {
    return new Promise((resolve) => {
      let data = '';
      req.on('data', (chunk) => {
        data += chunk;
      });
      req.on('end', () => {
        try {
          resolve(data ? JSON.parse(data) : null);
        } catch {
          resolve(null);
        }
      });
    });
  }

  /**
   * Handle errors
   * @param {Error} error
   * @param {ServerResponse} res
   */
  #handleError(error, res) {
    console.error('Unhandled API error:', error);

    res.statusCode = error.statusCode || 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: {
          code: error.code || 'INTERNAL_ERROR',
          message: error.message || 'An unexpected error occurred',
        },
      })
    );
  }
}
