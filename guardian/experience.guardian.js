/**
 * Experience Engine Guardian
 * 
 * Validates Experience Engine boundaries and architecture compliance.
 * Detects forbidden patterns, hardcoded values, and boundary violations.
 */

import fs from 'fs'
import path from 'path'

const FORBIDDEN_IMPORTS = {
  'pg': 'PostgreSQL driver - use Repository pattern',
  'postgres': 'PostgreSQL driver - use Repository pattern',
  'postgresql': 'PostgreSQL driver - use Repository pattern',
  '@neondatabase': 'Neon PostgreSQL - use Repository pattern',
  'mysql': 'MySQL driver - use Repository pattern',
  'mysql2': 'MySQL driver - use Repository pattern',
  'better-sqlite3': 'SQLite driver - use Repository pattern',
  '@aws-sdk/client-s3': 'AWS S3 SDK - use Storage Capability',
  '@aws-sdk/client-r2': 'Cloudflare R2 SDK - use Storage Capability',
  's3': 'AWS S3 - use Storage Capability',
  'sharp': 'Sharp - use Media Capability',
  'libvips': 'libvips - use Media Capability',
  'fluent-ffmpeg': 'FFmpeg - use Media Capability',
  'ffmpeg': 'FFmpeg - use Media Capability',
  'pdf-parse': 'PDF parsing - use Media Capability',
  'canvas': 'Canvas - use Media Capability',
  'stripe': 'Stripe SDK - use Payment Capability',
  'mercadopago': 'MercadoPago SDK - use Payment Capability',
  'transbank': 'Transbank SDK - use Payment Capability',
  'sendgrid': 'SendGrid - use Mail Capability',
  'nodemailer': 'nodemailer - use Mail Capability',
  'mailgun': 'Mailgun - use Mail Capability',
  'twilio': 'Twilio - use Notification Capability',
  'firebase-admin': 'Firebase - use Notification Capability',
  'drizzle': 'Drizzle ORM - use Repository Engine',
  'knex': 'Knex - use Repository Engine',
  'typeorm': 'TypeORM - use Repository Engine'
}

const FORBIDDEN_PATTERNS = [
  { pattern: /hardcoded.*product/i, message: 'Hardcoded product identity found' },
  { pattern: /hardcoded.*destination/i, message: 'Hardcoded destination identity found' },
  { pattern: /hardcoded.*company/i, message: 'Hardcoded company identity found' },
  { pattern: /dronestica/i, message: 'Dronestica hardcoded reference found in Experience Engine' },
  { pattern: /valdi\.app/gi, message: 'Hardcoded domain reference should be configuration' },
  { pattern: /SELECT.*FROM.*businesses?/i, message: 'Direct SQL query detected' },
  { pattern: /INSERT.*INTO.*businesses?/i, message: 'Direct SQL INSERT detected' },
  { pattern: /UPDATE.*businesses?.*SET/i, message: 'Direct SQL UPDATE detected' },
  { pattern: /DELETE.*FROM.*businesses?/i, message: 'Direct SQL DELETE detected' },
  { pattern: /db\.query\(/i, message: 'Direct database query detected' },
  { pattern: /await.*\.(query|execute)\(/i, message: 'Direct query execution detected' },
  { pattern: /new.*Pool/i, message: 'Direct connection pool creation detected' }
]

const FORBIDDEN_FILE_PATTERNS = [
  /experience.*\.test\.js$/,
  /experience.*\.spec\.js$/
]

const ALLOWED_DIRECTORIES = [
  'experience',
  'ecosystems',
  'companies',
  'config'
]

const PLATFORM_DIRECTORIES = [
  'runtime',
  'repository',
  'api',
  'business',
  'capabilities',
  'guardian',
  'health',
  'database',
  'storage',
  'media'
]

export class ExperienceEngineGuardian {
  constructor() {
    this.violations = []
    this.warnings = []
    this.basePath = process.cwd()
  }

  get name() {
    return 'ExperienceEngineGuardian'
  }

  validate(filePath, content) {
    this.violations = []
    this.warnings = []

    if (!filePath) {
      return { valid: true, violations: [], warnings: [] }
    }

    this.#checkForbiddenImports(filePath, content)
    this.#checkForbiddenPatterns(filePath, content)
    this.#checkDirectoryAccess(filePath)
    this.#checkHardcodedIdentities(filePath, content)

    return {
      valid: this.violations.length === 0,
      violations: this.violations,
      warnings: this.warnings
    }
  }

  #checkForbiddenImports(filePath, content) {
    if (!content || typeof content !== 'string') {
      return
    }

    for (const [importName, reason] of Object.entries(FORBIDDEN_IMPORTS)) {
      const importPattern = new RegExp(`from\\s+['"]${importName}['"]`, 'gi')
      const requirePattern = new RegExp(`require\\(['"]${importName}['"]\\)`, 'gi')

      if (importPattern.test(content) || requirePattern.test(content)) {
        this.violations.push({
          type: 'FORBIDDEN_IMPORT',
          file: filePath,
          import: importName,
          reason,
          severity: 'BLOCKER'
        })
      }
    }
  }

  #checkForbiddenPatterns(filePath, content) {
    if (!content || typeof content !== 'string') {
      return
    }

    for (const { pattern, message } of FORBIDDEN_PATTERNS) {
      const matches = content.match(pattern)
      if (matches) {
        this.violations.push({
          type: 'FORBIDDEN_PATTERN',
          file: filePath,
          pattern: pattern.toString(),
          matches,
          message,
          severity: 'BLOCKER'
        })
      }
    }
  }

  #checkDirectoryAccess(filePath, content) {
    if (!filePath) return

    const relativePath = path.relative(this.basePath, filePath)

    for (const platformDir of PLATFORM_DIRECTORIES) {
      const dirPattern = new RegExp(`(^|[/\\\\])${platformDir}([/\\\\])`, 'gi')
      if (dirPattern.test(relativePath)) {
        if (!this.#isAllowedAccess(filePath, content)) {
          this.violations.push({
            type: 'PLATFORM_ACCESS',
            file: filePath,
            directory: platformDir,
            message: `Experience Engine accessing Platform Core directory: ${platformDir}`,
            severity: 'BLOCKER'
          })
        }
      }
    }
  }

  #isAllowedAccess(filePath, content) {
    if (!content) return false

    const allowedPatterns = [
      /capabilities\/(?:core|tenant|persistence|storage)/i,
      /runtime\/bootstrap\/(?!.*business)/i,
      /repository\/.*contract/i,
      /capabilities\/.*manager\.js/i
    ]

    for (const pattern of allowedPatterns) {
      if (pattern.test(filePath)) {
        return true
      }
    }

    return false
  }

  #checkHardcodedIdentities(filePath, content) {
    if (!content || typeof content !== 'string') {
      return
    }

    const hardcodedProducts = [
      'dronestica', 'Dronestica', 'DRONESTICA',
      'albasie', 'Albasie', 'ALBASIE',
      'secnet', 'Secnet', 'SECNET',
      'esr-motos', 'ESR Motos', 'esr_motos'
    ]

    const lines = content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      for (const product of hardcodedProducts) {
        if (line.includes(product)) {
          const context = line.substring(Math.max(0, line.indexOf(product) - 20), line.indexOf(product) + product.length + 20)
          
          if (!this.#isAllowedReference(filePath, product, context)) {
            this.violations.push({
              type: 'HARDCODED_IDENTITY',
              file: filePath,
              line: i + 1,
              identity: product,
              context: context.trim(),
              message: `Hardcoded product/company identity found: ${product}`,
              severity: 'HIGH'
            })
          }
        }
      }
    }
  }

  #isAllowedReference(filePath, identity, context) {
    if (!filePath) return false

    const allowedContexts = [
      'config/',
      'data.js',
      'ecosystems/',
      'companies/',
      'documentation',
      'test',
      'mock',
      'fixture'
    ]

    for (const allowed of allowedContexts) {
      if (filePath.includes(allowed)) {
        return true
      }
    }

    if (context.includes('config') || context.includes('Config')) {
      return true
    }

    if (context.includes('description') || context.includes('name')) {
      return true
    }

    if (context.includes('Product') && context.includes('Resolver')) {
      return true
    }

    return false
  }

  validateDirectory(dirPath) {
    this.violations = []
    this.warnings = []

    const results = []

    const validateFile = (filePath) => {
      try {
        const content = fs.readFileSync(filePath, 'utf-8')
        const result = this.validate(filePath, content)
        if (!result.valid) {
          results.push(...result.violations)
        }
      } catch (error) {
        this.warnings.push({
          type: 'FILE_READ_ERROR',
          file: filePath,
          message: `Could not read file: ${error.message}`
        })
      }
    }

    const walkDir = (dir) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true })
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name)
          if (entry.isDirectory()) {
            if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
              walkDir(fullPath)
            }
          } else if (entry.isFile() && entry.name.endsWith('.js')) {
            validateFile(fullPath)
          }
        }
      } catch (error) {
        this.warnings.push({
          type: 'DIRECTORY_READ_ERROR',
          directory: dir,
          message: `Could not read directory: ${error.message}`
        })
      }
    }

    walkDir(dirPath)

    return {
      valid: results.length === 0,
      violations: results,
      warnings: this.warnings
    }
  }

  validateExperienceEngine() {
    const experiencePath = path.join(this.basePath, 'experience')
    const ecosystemsPath = path.join(this.basePath, 'ecosystems')
    const companiesPath = path.join(this.basePath, 'companies')

    const results = []

    if (fs.existsSync(experiencePath)) {
      results.push({
        path: experiencePath,
        ...this.validateDirectory(experiencePath)
      })
    }

    if (fs.existsSync(ecosystemsPath)) {
      results.push({
        path: ecosystemsPath,
        ...this.validateDirectory(ecosystemsPath)
      })
    }

    if (fs.existsSync(companiesPath)) {
      results.push({
        path: companiesPath,
        ...this.validateDirectory(companiesPath)
      })
    }

    const allViolations = results.flatMap(r => r.violations)
    const allWarnings = results.flatMap(r => r.warnings)

    return {
      valid: allViolations.length === 0,
      violations: allViolations,
      warnings: allWarnings,
      results
    }
  }

  getScore() {
    const total = this.violations.length + (this.warnings.length * 0.5)
    if (total === 0) return 100
    return Math.max(0, 100 - (total * 10))
  }

  getReport() {
    return {
      guardian: this.name,
      timestamp: new Date().toISOString(),
      score: this.getScore(),
      violationsCount: this.violations.length,
      warningsCount: this.warnings.length,
      violations: this.violations,
      warnings: this.warnings
    }
  }
}

export default ExperienceEngineGuardian
