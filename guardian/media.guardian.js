/**
 * Media Guardian
 *
 * P12.3.2.3 — Media Processing Engine
 *
 * Validates media architecture compliance.
 * Ensures no direct media library usage outside media layer.
 * Ensures Storage Platform is the only storage abstraction.
 *
 * Design Freeze P13.8: Platform Core, Runtime, API, BusinessService are frozen
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

const FORBIDDEN_PATTERNS = {
  sharp: ['from \'sharp\'', 'require(\'sharp\')'],
  ffmpeg: ['from \'fluent-ffmpeg\'', 'require(\'fluent-ffmpeg\')', 'from \'ffmpeg\'', 'require(\'ffmpeg\')'],
  pdfParse: ['from \'pdf-parse\'', 'require(\'pdf-parse\')'],
  canvas: ['from \'canvas\'', 'require(\'canvas\')'],
  pdf2pic: ['from \'pdf2pic\'', 'require(\'pdf2pic\')'],
  cloudflare: ['from \'cloudflare\'', 'require(\'cloudflare\')'],
}

const FORBIDDEN_DIRECTORIES = [
  'capabilities/',
  'api/controllers/',
  'api/routes/',
  'business/',
  'runtime/',
]

export class MediaGuardian {
  constructor() {
    this.name = 'Media Guardian'
    this.results = {
      checked: [],
      violations: [],
      warnings: [],
      info: [],
    }
  }

  async run() {
    console.log('[MediaGuardian] Running media architecture checks...')

    await this.checkMediaDirectoryExists()
    await this.checkNoDirectLibraryUsage()
    await this.checkMediaEngineExists()
    await this.checkMediaCapabilityExists()
    await this.checkMediaManagerExists()
    await this.checkProcessingPipelineExists()
    await this.checkProcessorsExist()
    await this.checkCDNLayerExists()
    await this.checkQueueArchitectureExists()
    await this.checkDatabaseSchemaExists()
    await this.checkStoragePlatformIntegration()
    await this.checkNoStorageBypass()
    await this.checkNoCDNBypass()
    await this.checkEventGeneration()
    await this.checkDocumentationExists()

    return this.results
  }

  addViolation(message, file = null) {
    this.results.violations.push({
      guardian: 'media',
      message,
      file,
      timestamp: new Date().toISOString(),
    })
  }

  addWarning(message, file = null) {
    this.results.warnings.push({
      guardian: 'media',
      message,
      file,
      timestamp: new Date().toISOString(),
    })
  }

  addInfo(message, file = null) {
    this.results.info.push({
      guardian: 'media',
      message,
      file,
      timestamp: new Date().toISOString(),
    })
  }

  async checkMediaDirectoryExists() {
    const mediaPath = path.join(ROOT, 'media')
    const capabilityPath = path.join(ROOT, 'capabilities', 'media')

    if (fs.existsSync(mediaPath)) {
      this.results.checked.push('media/ directory exists')
      this.addInfo('Media directory exists', mediaPath)
    } else {
      this.addViolation('Media directory missing', mediaPath)
    }

    if (fs.existsSync(capabilityPath)) {
      this.results.checked.push('capabilities/media/ directory exists')
      this.addInfo('Media capability directory exists', capabilityPath)
    } else {
      this.addViolation('Media capability directory missing', capabilityPath)
    }
  }

  async checkNoDirectLibraryUsage() {
    for (const dir of FORBIDDEN_DIRECTORIES) {
      const dirPath = path.join(ROOT, dir)
      if (!fs.existsSync(dirPath)) continue

      await this.scanDirectoryForLibrary(dirPath)
    }

    this.results.checked.push('No direct media library usage outside media layer')
  }

  async scanDirectoryForLibrary(dirPath) {
    const files = this.getAllFiles(dirPath)

    for (const file of files) {
      if (file.endsWith('.json')) continue

      try {
        const content = fs.readFileSync(file, 'utf8')
        const relativePath = path.relative(ROOT, file)

        for (const [library, patterns] of Object.entries(FORBIDDEN_PATTERNS)) {
          for (const pattern of patterns) {
            if (content.includes(pattern)) {
              if (file.includes('media/') || file.includes('capabilities/media/')) {
                continue
              }
              this.addViolation(
                `Forbidden ${library} usage: "${pattern}" found outside media layer`,
                relativePath
              )
            }
          }
        }
      } catch {
      }
    }
  }

  getAllFiles(dirPath) {
    const files = []

    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name)

        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          files.push(...this.getAllFiles(fullPath))
        } else if (entry.isFile()) {
          files.push(fullPath)
        }
      }
    } catch {
    }

    return files
  }

  async checkMediaEngineExists() {
    const enginePath = path.join(ROOT, 'media', 'media.engine.js')

    if (fs.existsSync(enginePath)) {
      this.results.checked.push('MediaEngine exists')
      this.addInfo('MediaEngine exists', enginePath)
    } else {
      this.addViolation('MediaEngine missing', enginePath)
    }
  }

  async checkMediaCapabilityExists() {
    const capabilityPath = path.join(ROOT, 'capabilities', 'media', 'media.capability.js')

    if (fs.existsSync(capabilityPath)) {
      this.results.checked.push('MediaCapability exists')
      this.addInfo('MediaCapability exists', capabilityPath)
    } else {
      this.addViolation('MediaCapability missing', capabilityPath)
    }
  }

  async checkMediaManagerExists() {
    const managerPath = path.join(ROOT, 'capabilities', 'media', 'media.manager.js')

    if (fs.existsSync(managerPath)) {
      this.results.checked.push('MediaManager exists')
      this.addInfo('MediaManager exists', managerPath)
    } else {
      this.addViolation('MediaManager missing', managerPath)
    }
  }

  async checkProcessingPipelineExists() {
    const pipelinePath = path.join(ROOT, 'media', 'pipeline', 'media.pipeline.js')

    if (fs.existsSync(pipelinePath)) {
      this.results.checked.push('MediaPipeline exists')
      this.addInfo('MediaPipeline exists', pipelinePath)
    } else {
      this.addViolation('MediaPipeline missing', pipelinePath)
    }
  }

  async checkProcessorsExist() {
    const processors = [
      'image.processor.js',
      'video.processor.js',
      'document.processor.js',
      'audio.processor.js',
    ]

    let allExist = true

    for (const processor of processors) {
      const processorPath = path.join(ROOT, 'media', 'processors', processor)

      if (!fs.existsSync(processorPath)) {
        this.addViolation(`Processor missing: ${processor}`, processorPath)
        allExist = false
      }
    }

    if (allExist) {
      this.results.checked.push('All media processors exist')
      this.addInfo('All media processors exist')
    }
  }

  async checkCDNLayerExists() {
    const cdnPath = path.join(ROOT, 'media', 'cdn', 'cdn.layer.js')

    if (fs.existsSync(cdnPath)) {
      this.results.checked.push('MediaCDNLayer exists')
      this.addInfo('MediaCDNLayer exists', cdnPath)
    } else {
      this.addViolation('MediaCDNLayer missing', cdnPath)
    }
  }

  async checkQueueArchitectureExists() {
    const queuePath = path.join(ROOT, 'media', 'queue', 'media.queue.js')

    if (fs.existsSync(queuePath)) {
      this.results.checked.push('MediaQueue exists')
      this.addInfo('MediaQueue exists', queuePath)
    } else {
      this.addViolation('MediaQueue missing', queuePath)
    }
  }

  async checkDatabaseSchemaExists() {
    const schemaPath = path.join(ROOT, 'database', 'schema', 'media', 'index.js')

    if (fs.existsSync(schemaPath)) {
      this.results.checked.push('Media database schema exists')
      this.addInfo('Media database schema exists', schemaPath)
    } else {
      this.addViolation('Media database schema missing', schemaPath)
    }
  }

  async checkStoragePlatformIntegration() {
    const enginePath = path.join(ROOT, 'media', 'media.engine.js')

    if (!fs.existsSync(enginePath)) {
      return
    }

    const content = fs.readFileSync(enginePath, 'utf8')

    if (content.includes('storage')) {
      this.results.checked.push('MediaEngine uses Storage Platform')
      this.addInfo('MediaEngine integrates with Storage Platform')
    }
  }

  async checkNoStorageBypass() {
    const mediaFiles = [
      path.join(ROOT, 'media', 'processors', 'image.processor.js'),
      path.join(ROOT, 'media', 'processors', 'video.processor.js'),
    ]

    for (const file of mediaFiles) {
      if (!fs.existsSync(file)) continue

      const content = fs.readFileSync(file, 'utf8')

      if (content.includes("import fs from 'fs'") || content.includes('require("fs")')) {
        const relativePath = path.relative(ROOT, file)
        this.addViolation(
          `Processor should not import fs directly. Use Storage Platform.`,
          relativePath
        )
      }
    }

    this.results.checked.push('No storage bypass in media processors')
  }

  async checkNoCDNBypass() {
    const managerPath = path.join(ROOT, 'capabilities', 'media', 'media.manager.js')

    if (!fs.existsSync(managerPath)) {
      return
    }

    const content = fs.readFileSync(managerPath, 'utf8')

    if (content.includes("from 'cloudflare'") || content.includes('require("cloudflare")')) {
      this.addViolation('MediaManager should not directly import CDN libraries', managerPath)
    }

    this.results.checked.push('No CDN bypass in media layer')
  }

  async checkEventGeneration() {
    const eventsPath = path.join(ROOT, 'media', 'media.events.js')

    if (fs.existsSync(eventsPath)) {
      const content = fs.readFileSync(eventsPath, 'utf8')

      const requiredEvents = [
        'MEDIA_UPLOADED',
        'MEDIA_PROCESSED',
        'MEDIA_OPTIMIZED',
        'MEDIA_VARIANTS_CREATED',
        'MEDIA_DELETED',
        'MEDIA_FAILED',
        'MEDIA_STREAM_READY',
        'MEDIA_METADATA_UPDATED',
      ]

      for (const event of requiredEvents) {
        if (!content.includes(event)) {
          this.addWarning(`Media event missing: ${event}`, eventsPath)
        }
      }

      this.results.checked.push('Media events defined')
      this.addInfo('Media events exist', eventsPath)
    } else {
      this.addViolation('Media events missing', eventsPath)
    }
  }

  async checkDocumentationExists() {
    const docs = [
      { path: 'docs/media/MEDIA_ENGINE.md', name: 'Media Engine' },
      { path: 'docs/media/MEDIA_PIPELINE.md', name: 'Media Pipeline' },
      { path: 'docs/media/IMAGE_PROCESSING.md', name: 'Image Processing' },
      { path: 'docs/media/VIDEO_PROCESSING.md', name: 'Video Processing' },
    ]

    let docsFound = 0

    for (const doc of docs) {
      const docPath = path.join(ROOT, doc.path)
      if (fs.existsSync(docPath)) {
        docsFound++
      }
    }

    if (docsFound >= 2) {
      this.results.checked.push('Media documentation exists')
      this.addInfo(`Media documentation: ${docsFound}/${docs.length} files exist`)
    }
  }
}

export default MediaGuardian
