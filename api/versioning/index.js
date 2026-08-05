/**
 * API Versioning
 *
 * Version routing and negotiation.
 *
 * P14 - API Layer Foundation
 */

import { Router } from '../routes/router.js';

const VERSIONS = ['v1'];

/**
 * Register versioned routes
 * @param {Router} router
 */
export function registerVersioning(router) {
  const versionRouter = new Router();

  router.use(async (req, res, next) => {
    const acceptHeader = req.headers.accept;
    const urlPath = req.pathname;

    let version = 'v1';
    let effectivePath = urlPath;

    if (urlPath.startsWith('/api/')) {
      const pathWithoutApi = urlPath.slice(4);
      const match = pathWithoutApi.match(/^\/(v\d+)\//);

      if (match) {
        version = match[1];
        effectivePath = pathWithoutApi.slice(match[0].length - match[1].length - 1);
      }
    }

    req.apiVersion = version;
    req.apiPath = effectivePath;

    return next();
  });
}

/**
 * Get current API version
 * @param {Object} req
 * @returns {string}
 */
export function getApiVersion(req) {
  return req.apiVersion || 'v1';
}

/**
 * Get effective API path
 * @param {Object} req
 * @returns {string}
 */
export function getApiPath(req) {
  return req.apiPath || req.pathname;
}

/**
 * Get supported versions
 * @returns {string[]}
 */
export function getSupportedVersions() {
  return [...VERSIONS];
}
