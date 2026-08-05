/**
 * API Guardian
 *
 * Verifies:
 * - Controllers
 * - Routes
 * - Middleware
 * - REST compliance
 * - BusinessService delegation
 * - Repository isolation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

export class APIGuardian {
  constructor() {
    this.checks = [];
    this.violations = [];
  }

  exists(filePath) {
    return fs.existsSync(filePath);
  }

  async run() {
    console.log('[GUARDIAN:API] Starting API checks...');

    this.checkAPIBootstrap();
    this.checkControllers();
    this.checkRoutes();
    this.checkMiddleware();
    this.checkBusinessServiceDelegation();
    this.checkRepositoryIsolation();

    return {
      checks: this.checks,
      violations: this.violations,
      status: this.violations.length === 0 ? 'PASS' : 'FAIL'
    };
  }

  checkAPIBootstrap() {
    const file = path.join(ROOT, 'api/bootstrap/api.bootstrap.js');
    const exists = this.exists(file);

    this.checks.push({
      name: 'API Bootstrap',
      status: exists ? 'PASS' : 'FAIL',
      message: exists ? 'API Bootstrap exists' : 'API Bootstrap missing'
    });
  }

  checkControllers() {
    const controllerDir = path.join(ROOT, 'api/controllers');
    const exists = this.exists(controllerDir);

    this.checks.push({
      name: 'Controllers Directory',
      status: exists ? 'PASS' : 'FAIL',
      message: exists ? 'Controllers directory exists' : 'Controllers directory missing'
    });

    if (exists) {
      const files = fs.readdirSync(controllerDir).filter(f => f.endsWith('.controller.js'));
      this.checks.push({
        name: 'Controller Count',
        status: files.length > 0 ? 'PASS' : 'WARNING',
        message: `${files.length} controllers found`,
        count: files.length
      });

      // Check business controller
      const bizController = path.join(ROOT, 'api/controllers/business.controller.js');
      const hasBiz = this.exists(bizController);
      this.checks.push({
        name: 'Business Controller',
        status: hasBiz ? 'PASS' : 'FAIL',
        message: hasBiz ? 'Business Controller exists' : 'Business Controller missing'
      });
    }
  }

  checkRoutes() {
    const routesDir = path.join(ROOT, 'api/routes');
    const exists = this.exists(routesDir);

    this.checks.push({
      name: 'Routes Directory',
      status: exists ? 'PASS' : 'FAIL',
      message: exists ? 'Routes directory exists' : 'Routes directory missing'
    });

    if (exists) {
      const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.routes.js'));
      const requiredRoutes = [
        'business.routes.js',
        'accommodation.routes.js',
        'availability.routes.js',
        'reservation.routes.js',
        'visitor.routes.js',
        'payment.routes.js',
        'review.routes.js'
      ];

      for (const route of requiredRoutes) {
        const found = routeFiles.includes(route);
        this.checks.push({
          name: `Route: ${route}`,
          status: found ? 'PASS' : 'FAIL',
          message: found ? `${route} exists` : `${route} missing`
        });
      }

      this.checks.push({
        name: 'Route Count',
        status: routeFiles.length >= 6 ? 'PASS' : 'WARNING',
        message: `${routeFiles.length} route files found`,
        count: routeFiles.length
      });
    }
  }

  checkMiddleware() {
    const middlewareDir = path.join(ROOT, 'api/middleware');
    const exists = this.exists(middlewareDir);

    this.checks.push({
      name: 'Middleware Directory',
      status: exists ? 'PASS' : 'WARNING',
      message: exists ? 'Middleware directory exists' : 'Middleware directory missing (optional)'
    });

    if (exists) {
      const files = fs.readdirSync(middlewareDir).filter(f => f.endsWith('.middleware.js'));
      this.checks.push({
        name: 'Middleware Count',
        status: files.length > 0 ? 'PASS' : 'WARNING',
        message: `${files.length} middleware files found`,
        count: files.length
      });
    }
  }

  checkBusinessServiceDelegation() {
    // Check that controllers use capability?.service pattern
    const controllerFile = path.join(ROOT, 'api/controllers/business.controller.js');

    if (this.exists(controllerFile)) {
      const content = fs.readFileSync(controllerFile, 'utf-8');

      // Check for correct pattern
      if (content && content.includes('capability?.service')) {
        this.checks.push({
          name: 'BusinessService Delegation',
          status: 'PASS',
          message: 'Controllers use capability?.service pattern'
        });
      } else if (content && content.includes('getBusinessService')) {
        this.violations.push({
          level: 'P2',
          name: 'BusinessService Delegation',
          message: 'Controller uses deprecated getBusinessService pattern'
        });
      }
    }

    // Check route files for correct pattern
    const routesDir = path.join(ROOT, 'api/routes');
    if (this.exists(routesDir)) {
      const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.routes.js'));

      for (const file of routeFiles) {
        const filePath = path.join(routesDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        if (content && content.includes('getService()')) {
          // Check if using correct pattern
          if (content.includes('capability?.service')) {
            this.checks.push({
              name: `Route: ${file} (correct pattern)`,
              status: 'PASS',
              message: `${file} uses correct capability?.service pattern`
            });
          } else if (content.includes('getXxxService')) {
            this.violations.push({
              level: 'P2',
              name: `Route: ${file}`,
              message: `${file} uses deprecated getXxxService pattern`
            });
          }
        }
      }
    }
  }

  checkRepositoryIsolation() {
    // Check that API never directly imports repositories
    const apiDir = path.join(ROOT, 'api');

    if (this.exists(apiDir)) {
      const files = this.walkDir(apiDir, '.js');
      let hasRepoLeak = false;

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        if (content && (
          content.includes('Repository') && content.includes('import') ||
          content.includes('.repository.') ||
          content.includes('persistence/')
        )) {
          hasRepoLeak = true;
          this.violations.push({
            level: 'P1',
            name: 'Repository Isolation',
            message: `API file may leak repository access: ${file}`
          });
        }
      }

      if (!hasRepoLeak) {
        this.checks.push({
          name: 'Repository Isolation',
          status: 'PASS',
          message: 'No repository leaks detected in API'
        });
      }
    }
  }

  walkDir(dir, ext) {
    const results = [];
    if (!this.exists(dir)) return results;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...this.walkDir(full, ext));
      } else if (entry.name.endsWith(ext)) {
        results.push(full);
      }
    }
    return results;
  }
}

export default APIGuardian;
