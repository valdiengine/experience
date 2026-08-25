/**
 * Owner API Handler
 *
 * Handles owner authentication and management API endpoints.
 */

import {
  authenticateOwner,
  invalidateSession,
  validateSession,
  extendSession
} from './owner.auth.js'

import {
  findActiveSessionsForUser,
  revokeSessionByIdForUser,
  revokeAllOtherSessionsForUser
} from './repositories/owner-session.repository.js'

import {
  createOwnerAuthMiddleware,
  requireOwnerAuth,
  requireOwnerPermission,
  requireOwnerApplicationAccess,
  buildOwnerContext
} from './owner.middleware.js'

import {
  validateBusinessInfoField,
  sanitizeOwnerInput
} from './owner.identity.js'

import {
  createPushSubscriptionService
} from '../business/push/push.subscription.service.js'

import {
  createPushSubscriptionPersistence
} from '../business/push/persistence/push.subscription.persistence.js'

import {
  createPushCampaignService
} from '../business/push/push.campaign.service.js'

import {
  createPushCampaignPersistence
} from '../business/push/persistence/push.campaign.persistence.js'

import {
  PushNotificationAdapter
} from '../business/notification/adapters/push/push.adapter.js'

import {
  createOwnerContentPersistence
} from './persistence/owner-content.persistence.js'

import {
  createOwnerContentService
} from './owner-content.service.js'

import {
  createOwnerMediaPersistence
} from './persistence/owner-media.persistence.js'

import {
  createOwnerMediaService
} from './owner-media.service.js'

import {
  createOwnerBusinessPersistence
} from './persistence/owner-business.persistence.js'

const contentPersistence = createOwnerContentPersistence()
const contentService = createOwnerContentService({
  persistence: contentPersistence,
  auditLog: { log: () => {} }
})

const mediaPersistence = createOwnerMediaPersistence()
const mediaService = createOwnerMediaService({
  persistence: mediaPersistence,
  auditLog: { log: () => {} }
})

const businessPersistence = createOwnerBusinessPersistence()

const pushPersistence = createPushSubscriptionPersistence()
const pushService = createPushSubscriptionService({ persistence: pushPersistence })
const campaignPersistence = createPushCampaignPersistence()
const campaignService = createPushCampaignService({
  campaignPersistence,
  subscriptionPersistence: pushPersistence
})

function sendJson(res, statusCode, data) {
  const safeStatus = isValidHttpStatus(statusCode) ? statusCode : 500
  res.statusCode = safeStatus
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
}

function isValidHttpStatus(code) {
  return typeof code === 'number' && Number.isInteger(code) && code >= 100 && code <= 599
}

function isValidUUID(str) {
  if (typeof str !== 'string') return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

function getSessionId(req) {
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  return null
}

export function createOwnerAPIHandler() {
  return {
    async handleLogin(req, res) {
      try {
        let body = ''
        for await (const chunk of req) {
          body += chunk
        }

        let data
        try {
          data = JSON.parse(body)
        } catch {
          sendJson(res, 400, { error: 'Bad Request', message: 'Invalid JSON body' })
          return
        }

        const { email, password } = data

        if (!email || !password) {
          sendJson(res, 400, { error: 'Bad Request', message: 'Email and password are required' })
          return
        }

        const result = await authenticateOwner(email, password)

        if (!result.success) {
          const errorCode = result.error
          if (errorCode === 'INFRASTRUCTURE_UNAVAILABLE') {
            sendJson(res, 503, { error: 'Service Unavailable', message: 'Infrastructure temporarily unavailable' })
          } else if (errorCode === 'NO_ACTIVE_GRANT') {
            sendJson(res, 403, { error: 'Forbidden', message: result.error })
          } else if (errorCode === 'AMBIGUOUS_APPLICATION') {
            sendJson(res, 409, { error: 'Conflict', message: 'Multiple applications available for this user. Application selection required.' })
          } else {
            sendJson(res, 401, { error: 'Unauthorized', message: result.error })
          }
          return
        }

        sendJson(res, 200, {
          success: true,
          session: result.session
        })
      } catch (error) {
        console.error('[OwnerAPI] Login error:', error)
        sendJson(res, 500, { error: 'Internal Server Error', message: 'Login failed' })
      }
    },

    async handleLogout(req, res) {
      const sessionId = getSessionId(req)

      if (sessionId) {
        try {
          await invalidateSession(sessionId)
        } catch (error) {
          if (error.code === 'INFRASTRUCTURE_UNAVAILABLE') {
            sendJson(res, 503, { error: 'Service Unavailable', message: 'Infrastructure temporarily unavailable' })
            return
          }
          throw error
        }
      }

      sendJson(res, 200, { success: true, message: 'Logged out successfully' })
    },

    async handleMe(req, res) {
      if (!req.isOwnerAuthenticated || !req.owner) {
        sendJson(res, 401, { error: 'Unauthorized', message: 'Not authenticated' })
        return
      }

      sendJson(res, 200, {
        success: true,
        owner: buildOwnerContext(req)
      })
    },

    async handleSessionExtend(req, res) {
      const sessionId = getSessionId(req)
      if (!sessionId) {
        sendJson(res, 401, { error: 'Unauthorized', message: 'No session' })
        return
      }

      let extended
      try {
        extended = await extendSession(sessionId)
      } catch (error) {
        if (error.code === 'INFRASTRUCTURE_UNAVAILABLE') {
          sendJson(res, 503, { error: 'Service Unavailable', message: 'Infrastructure temporarily unavailable' })
          return
        }
        throw error
      }

      if (!extended) {
        sendJson(res, 401, { error: 'Unauthorized', message: 'Session not found' })
        return
      }

      let session
      try {
        session = await validateSession(sessionId)
      } catch (error) {
        if (error.code === 'INFRASTRUCTURE_UNAVAILABLE') {
          sendJson(res, 503, { error: 'Service Unavailable', message: 'Infrastructure temporarily unavailable' })
          return
        }
        throw error
      }

      sendJson(res, 200, {
        success: true,
        session: {
          id: session.id,
          expiresAt: session.expiresAt
        }
      })
    },

    async handleGetSessions(req, res) {
      if (!req.isOwnerAuthenticated || !req.owner) {
        sendJson(res, 401, { error: 'Unauthorized', message: 'Not authenticated' })
        return
      }

      let sessions
      try {
        sessions = await findActiveSessionsForUser(req.owner.id)
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
          sendJson(res, 503, { error: 'Service Unavailable', message: 'Infrastructure temporarily unavailable' })
          return
        }
        throw error
      }

      const currentSessionId = req.ownerSession?.id

      sendJson(res, 200, {
        success: true,
        sessions: sessions.map(session => ({
          id: session.id,
          applicationId: session.application_id,
          createdAt: session.created_at,
          expiresAt: session.expires_at,
          isCurrent: session.id === currentSessionId
        }))
      })
    },

    async handleRevokeSession(req, res, sessionId) {
      if (!req.isOwnerAuthenticated || !req.owner) {
        sendJson(res, 401, { error: 'Unauthorized', message: 'Not authenticated' })
        return
      }

      if (!isValidUUID(sessionId)) {
        sendJson(res, 200, { success: true, message: 'Session revoked' })
        return
      }

      try {
        await revokeSessionByIdForUser(sessionId, req.owner.id)
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
          sendJson(res, 503, { error: 'Service Unavailable', message: 'Infrastructure temporarily unavailable' })
          return
        }
        throw error
      }

      sendJson(res, 200, { success: true, message: 'Session revoked' })
    },

    async handleRevokeOtherSessions(req, res) {
      if (!req.isOwnerAuthenticated || !req.owner) {
        sendJson(res, 401, { error: 'Unauthorized', message: 'Not authenticated' })
        return
      }

      const currentSessionId = req.ownerSession?.id
      if (!currentSessionId) {
        sendJson(res, 401, { error: 'Unauthorized', message: 'No active session' })
        return
      }

      let revoked
      try {
        revoked = await revokeAllOtherSessionsForUser(req.owner.id, currentSessionId)
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
          sendJson(res, 503, { error: 'Service Unavailable', message: 'Infrastructure temporarily unavailable' })
          return
        }
        throw error
      }

      sendJson(res, 200, {
        success: true,
        message: 'Other sessions revoked',
        revokedCount: revoked.length
      })
    },

    async handleGetApplication(req, res) {
      if (!req.isOwnerAuthenticated || !req.owner) {
        sendJson(res, 401, { error: 'Unauthorized', message: 'Not authenticated' })
        return
      }

      const applicationId = req.owner.applicationId

      const application = {
        applicationId,
        domain: applicationId.split('/')[0],
        route: '/' + applicationId.split('/')[1],
        status: 'active',
        capabilities: req.owner.role === 'business_owner'
          ? ['quote', 'gallery', 'contact', 'pwa']
          : ['quote', 'gallery', 'contact', 'pwa', 'admin']
      }

      sendJson(res, 200, {
        success: true,
        application
      })
    },

    async handleGetBusinessInfo(req, res) {
      if (!req.isOwnerAuthenticated || !req.owner) {
        sendJson(res, 401, { error: 'Unauthorized', message: 'Not authenticated' })
        return
      }

      const applicationId = req.owner.applicationId
      const businessData = businessPersistence.get(applicationId)

      if (businessData) {
        sendJson(res, 200, {
          success: true,
          business: businessData
        })
      } else {
        sendJson(res, 200, {
          success: true,
          business: null,
          message: 'No business profile persisted yet'
        })
      }
    },

    async handleUpdateBusinessInfo(req, res) {
      if (!req.isOwnerAuthenticated || !req.owner) {
        sendJson(res, 401, { error: 'Unauthorized', message: 'Not authenticated' })
        return
      }

      try {
        let body = ''
        for await (const chunk of req) {
          body += chunk
        }

        let data
        try {
          data = JSON.parse(body)
        } catch {
          sendJson(res, 400, { error: 'Bad Request', message: 'Invalid JSON body' })
          return
        }

        const updates = {}
        const errors = []

        for (const [key, value] of Object.entries(data)) {
          const validation = validateBusinessInfoField(key, value)
          if (!validation.valid) {
            errors.push(validation.error)
          } else {
            updates[key] = validation.value
          }
        }

        if (errors.length > 0) {
          sendJson(res, 400, { error: 'Validation Failed', message: errors.join('; ') })
          return
        }

        const applicationId = req.owner.applicationId
        businessPersistence.save(applicationId, updates)

        sendJson(res, 200, {
          success: true,
          message: 'Business information updated',
          updates
        })
      } catch (error) {
        console.error('[OwnerAPI] Update error:', error)
        sendJson(res, 500, { error: 'Internal Server Error', message: 'Update failed' })
      }
    },

    async handleGetInbox(req, res) {
      if (!req.isOwnerAuthenticated || !req.owner) {
        sendJson(res, 401, { error: 'Unauthorized', message: 'Not authenticated' })
        return
      }

      const applicationId = req.owner.applicationId

      sendJson(res, 200, {
        success: true,
        applicationId,
        inbox: [],
        message: 'Inbox functionality ready - connect to persistence layer'
      })
    },

    async handleGetQuotes(req, res) {
      if (!req.isOwnerAuthenticated || !req.owner) {
        sendJson(res, 401, { error: 'Unauthorized', message: 'Not authenticated' })
        return
      }

      const applicationId = req.owner.applicationId

      sendJson(res, 200, {
        success: true,
        applicationId,
        quotes: [],
        message: 'Quotes functionality ready - connect to persistence layer'
      })
    },

    async handleGetPushStatus(req, res) {
      if (!req.isOwnerAuthenticated || !req.owner) {
        sendJson(res, 401, { error: 'Unauthorized', message: 'Not authenticated' })
        return
      }

      const applicationId = req.owner.applicationId
      const status = await pushService.getStatus(applicationId)

      sendJson(res, 200, {
        success: true,
        applicationId,
        push: {
          status: status.active > 0 || status.revoked > 0 ? 'configured' : 'not_configured',
          subscribers: status.active,
          revoked: status.revoked
        }
      })
    },

    async handleGetPushCampaigns(req, res) {
      if (!req.isOwnerAuthenticated || !req.owner) {
        sendJson(res, 401, { error: 'Unauthorized', message: 'Not authenticated' })
        return
      }

      const applicationId = req.owner.applicationId
      const result = await campaignService.getByApplication(applicationId)

      sendJson(res, 200, result)
    },

    async handleGetPushCampaign(req, res, campaignId) {
      if (!req.isOwnerAuthenticated || !req.owner) {
        sendJson(res, 401, { error: 'Unauthorized', message: 'Not authenticated' })
        return
      }

      const applicationId = req.owner.applicationId
      const result = await campaignService.get(campaignId)

      if (!result.success) {
        sendJson(res, 404, result)
        return
      }

      if (result.campaign.applicationId !== applicationId) {
        sendJson(res, 403, { success: false, error: 'Forbidden' })
        return
      }

      sendJson(res, 200, result)
    },

    async handleCreatePushCampaign(req, res) {
      if (!req.isOwnerAuthenticated || !req.owner) {
        sendJson(res, 401, { error: 'Unauthorized', message: 'Not authenticated' })
        return
      }

      try {
        let body = ''
        for await (const chunk of req) {
          body += chunk
        }

        let data
        try {
          data = JSON.parse(body)
        } catch {
          sendJson(res, 400, { error: 'Bad Request', message: 'Invalid JSON' })
          return
        }

        const applicationId = req.owner.applicationId
        const createdBy = req.owner.email

        const result = await campaignService.create(applicationId, data, createdBy)

        if (!result.success) {
          sendJson(res, 400, result)
          return
        }

        sendJson(res, 201, result)
      } catch (error) {
        console.error('[OwnerAPI] Create campaign error:', error)
        sendJson(res, 500, { error: 'Internal Server Error' })
      }
    },

    async handleSendPushCampaign(req, res, campaignId) {
      if (!req.isOwnerAuthenticated || !req.owner) {
        sendJson(res, 401, { error: 'Unauthorized', message: 'Not authenticated' })
        return
      }

      try {
        const applicationId = req.owner.applicationId
        const campaignResult = await campaignService.get(campaignId)

        if (!campaignResult.success) {
          sendJson(res, 404, campaignResult)
          return
        }

        if (campaignResult.campaign.applicationId !== applicationId) {
          sendJson(res, 403, { success: false, error: 'Forbidden' })
          return
        }

        const pushAdapter = new PushNotificationAdapter({
          persistence: pushPersistence,
          mockMode: true
        })

        const result = await campaignService.send(campaignId, pushAdapter)

        if (!result.success) {
          sendJson(res, 400, result)
          return
        }

        sendJson(res, 200, result)
      } catch (error) {
        console.error('[OwnerAPI] Send campaign error:', error)
        sendJson(res, 500, { error: 'Internal Server Error' })
      }
    },

    async handleGetContent(req, res) {
      if (!req.isOwnerAuthenticated || !req.owner) {
        sendJson(res, 401, { error: 'Unauthorized' })
        return
      }

      const applicationId = req.owner.applicationId
      const result = await contentService.get(applicationId, applicationId)

      if (result.success) {
        sendJson(res, 200, result)
      } else {
        sendJson(res, result.status || 500, result)
      }
    },

    async handleGetContentDraft(req, res) {
      if (!req.isOwnerAuthenticated || !req.owner) {
        sendJson(res, 401, { error: 'Unauthorized' })
        return
      }

      const applicationId = req.owner.applicationId
      const result = await contentService.getDraft(applicationId, applicationId)

      if (result.success) {
        sendJson(res, 200, result)
      } else {
        sendJson(res, result.status || 500, result)
      }
    },

    async handleSaveContentDraft(req, res) {
      if (!req.isOwnerAuthenticated || !req.owner) {
        sendJson(res, 401, { error: 'Unauthorized' })
        return
      }

      try {
        let body = ''
        for await (const chunk of req) {
          body += chunk
        }

        let data
        try {
          data = JSON.parse(body)
        } catch {
          sendJson(res, 400, { error: 'Invalid JSON' })
          return
        }

        const applicationId = req.owner.applicationId
        const ownerEmail = req.owner.email
        const result = await contentService.saveDraft(applicationId, data, ownerEmail, applicationId)

        if (result.success) {
          sendJson(res, 200, result)
        } else {
          sendJson(res, result.status || 500, result)
        }
      } catch (error) {
        console.error('[OwnerAPI] Save draft error:', error)
        sendJson(res, 500, { error: 'Internal Server Error' })
      }
    },

    async handleDiscardContentDraft(req, res) {
      if (!req.isOwnerAuthenticated || !req.owner) {
        sendJson(res, 401, { error: 'Unauthorized' })
        return
      }

      const applicationId = req.owner.applicationId
      const ownerEmail = req.owner.email
      const result = await contentService.discardDraft(applicationId, ownerEmail, applicationId)

      if (result.success) {
        sendJson(res, 200, result)
      } else {
        sendJson(res, result.status || 500, result)
      }
    },

    async handleGetContentPreview(req, res) {
      if (!req.isOwnerAuthenticated || !req.owner) {
        sendJson(res, 401, { error: 'Unauthorized' })
        return
      }

      const applicationId = req.owner.applicationId
      const ownerEmail = req.owner.email
      const result = await contentService.preview(applicationId, ownerEmail, applicationId)

      if (result.success) {
        sendJson(res, 200, result)
      } else {
        sendJson(res, result.status || 500, result)
      }
    },

    async handlePublishContent(req, res) {
      if (!req.isOwnerAuthenticated || !req.owner) {
        sendJson(res, 401, { error: 'Unauthorized' })
        return
      }

      const applicationId = req.owner.applicationId
      const ownerEmail = req.owner.email
      const result = await contentService.publish(applicationId, ownerEmail, applicationId)

      if (result.success) {
        sendJson(res, 200, result)
      } else {
        sendJson(res, result.status || 500, result)
      }
    },

    async handleGetMedia(req, res) {
      if (!req.isOwnerAuthenticated || !req.owner) {
        sendJson(res, 401, { error: 'Unauthorized' })
        return
      }

      const applicationId = req.owner.applicationId
      const result = await mediaService.list(applicationId, applicationId)

      sendJson(res, 200, result)
    },

    async handleUploadMedia(req, res) {
      if (!req.isOwnerAuthenticated || !req.owner) {
        sendJson(res, 401, { error: 'Unauthorized' })
        return
      }

      try {
        const contentType = req.headers['content-type'] || ''

        if (!contentType.includes('multipart/form-data')) {
          sendJson(res, 400, { success: false, error: 'Expected multipart/form-data' })
          return
        }

        const applicationId = req.owner.applicationId
        const ownerEmail = req.owner.email

        const formData = await parseMultipart(req)
        const file = formData.file

        if (!file) {
          sendJson(res, 400, { success: false, error: 'No file provided' })
          return
        }

        const result = await mediaService.upload(file, applicationId, ownerEmail, applicationId)

        if (result.success) {
          sendJson(res, 201, result)
        } else {
          sendJson(res, result.status || 500, result)
        }
      } catch (error) {
        console.error('[OwnerAPI] Upload media error:', error)
        sendJson(res, 500, { error: 'Internal Server Error' })
      }
    },

    async handleSetFeaturedMedia(req, res, mediaId) {
      if (!req.isOwnerAuthenticated || !req.owner) {
        sendJson(res, 401, { error: 'Unauthorized' })
        return
      }

      const applicationId = req.owner.applicationId
      const ownerEmail = req.owner.email
      const result = await mediaService.setFeatured(mediaId, applicationId, ownerEmail, applicationId)

      if (result.success) {
        sendJson(res, 200, result)
      } else {
        sendJson(res, result.status || 500, result)
      }
    },

    async handleRemoveFeaturedMedia(req, res) {
      if (!req.isOwnerAuthenticated || !req.owner) {
        sendJson(res, 401, { error: 'Unauthorized' })
        return
      }

      const applicationId = req.owner.applicationId
      const ownerEmail = req.owner.email
      const result = await mediaService.removeFeatured(applicationId, ownerEmail, applicationId)

      sendJson(res, 200, result)
    },

    async handleAddToGallery(req, res, mediaId) {
      if (!req.isOwnerAuthenticated || !req.owner) {
        sendJson(res, 401, { error: 'Unauthorized' })
        return
      }

      const applicationId = req.owner.applicationId
      const ownerEmail = req.owner.email
      const result = await mediaService.addToGallery(mediaId, applicationId, ownerEmail, applicationId)

      if (result.success) {
        sendJson(res, 200, result)
      } else {
        sendJson(res, result.status || 500, result)
      }
    },

    async handleRemoveFromGallery(req, res, mediaId) {
      if (!req.isOwnerAuthenticated || !req.owner) {
        sendJson(res, 401, { error: 'Unauthorized' })
        return
      }

      const applicationId = req.owner.applicationId
      const ownerEmail = req.owner.email
      const result = await mediaService.removeFromGallery(mediaId, applicationId, ownerEmail, applicationId)

      sendJson(res, 200, result)
    },

    async handleReorderGallery(req, res) {
      if (!req.isOwnerAuthenticated || !req.owner) {
        sendJson(res, 401, { error: 'Unauthorized' })
        return
      }

      try {
        let body = ''
        for await (const chunk of req) {
          body += chunk
        }

        let data
        try {
          data = JSON.parse(body)
        } catch {
          sendJson(res, 400, { error: 'Invalid JSON' })
          return
        }

        const applicationId = req.owner.applicationId
        const ownerEmail = req.owner.email
        const { mediaIds } = data

        if (!Array.isArray(mediaIds)) {
          sendJson(res, 400, { success: false, error: 'mediaIds must be an array' })
          return
        }

        const result = await mediaService.reorderGallery(applicationId, mediaIds, ownerEmail, applicationId)

        if (result.success) {
          sendJson(res, 200, result)
        } else {
          sendJson(res, result.status || 500, result)
        }
      } catch (error) {
        console.error('[OwnerAPI] Reorder gallery error:', error)
        sendJson(res, 500, { error: 'Internal Server Error' })
      }
    },

    async handleDeleteMedia(req, res, mediaId) {
      if (!req.isOwnerAuthenticated || !req.owner) {
        sendJson(res, 401, { error: 'Unauthorized' })
        return
      }

      const applicationId = req.owner.applicationId
      const ownerEmail = req.owner.email
      const result = await mediaService.delete(mediaId, applicationId, ownerEmail, applicationId)

      if (result.success) {
        sendJson(res, 200, result)
      } else {
        sendJson(res, result.status || 500, result)
      }
    }
  }
}

async function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => {
      const buffer = Buffer.concat(chunks)
      const contentType = req.headers['content-type'] || ''

      if (!contentType.includes('multipart/form-data')) {
        resolve({})
        return
      }

      const boundaryMatch = contentType.match(/boundary=(.+)/)
      if (!boundaryMatch) {
        resolve({})
        return
      }

      const boundary = boundaryMatch[1]
      const parts = buffer.toString('binary').split(`--${boundary}`)

      const result = {}

      for (const part of parts) {
        if (!part || part === '--' || !part.includes('\r\n\r\n')) continue

        const [headerPart, ...bodyParts] = part.split('\r\n\r\n')
        const body = bodyParts.join('\r\n\r\n').replace(/\r\n$/, '')

        const nameMatch = headerPart.match(/name="([^"]+)"/)
        const filenameMatch = headerPart.match(/filename="([^"]+)"/)
        const contentTypeMatch = headerPart.match(/Content-Type:\s*([^\r\n]+)/)

        if (nameMatch) {
          const name = nameMatch[1]

          if (filenameMatch) {
            result[name] = {
              originalname: filenameMatch[1],
              mimetype: contentTypeMatch ? contentTypeMatch[1].trim() : 'application/octet-stream',
              buffer: Buffer.from(body, 'binary')
            }
          } else {
            result[name] = body
          }
        }
      }

      resolve(result)
    })
    req.on('error', reject)
  })
}

export function createOwnerRouter(handler) {
  const authMiddleware = createOwnerAuthMiddleware()

  return async function ownerRouter(req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`)
    const pathname = url.pathname

    await authMiddleware(req, res, () => {})

    if (pathname === '/api/v1/owner/login' && req.method === 'POST') {
      return handler.handleLogin(req, res)
    }

    if (pathname === '/api/v1/owner/logout' && req.method === 'POST') {
      return handler.handleLogout(req, res)
    }

    if (pathname === '/api/v1/owner/me' && req.method === 'GET') {
      return handler.handleMe(req, res)
    }

    if (pathname === '/api/v1/owner/session/extend' && req.method === 'POST') {
      return handler.handleSessionExtend(req, res)
    }

    if (pathname === '/api/v1/owner/sessions' && req.method === 'GET') {
      return handler.handleGetSessions(req, res)
    }

    if (pathname === '/api/v1/owner/sessions/revoke-others' && req.method === 'POST') {
      return handler.handleRevokeOtherSessions(req, res)
    }

    if (pathname === '/api/v1/owner/application' && req.method === 'GET') {
      return handler.handleGetApplication(req, res)
    }

    if (pathname === '/api/v1/owner/business' && req.method === 'GET') {
      return handler.handleGetBusinessInfo(req, res)
    }

    if (pathname === '/api/v1/owner/business' && req.method === 'PUT') {
      return handler.handleUpdateBusinessInfo(req, res)
    }

    if (pathname === '/api/v1/owner/inbox' && req.method === 'GET') {
      return handler.handleGetInbox(req, res)
    }

    if (pathname === '/api/v1/owner/quotes' && req.method === 'GET') {
      return handler.handleGetQuotes(req, res)
    }

    if (pathname === '/api/v1/owner/push' && req.method === 'GET') {
      return handler.handleGetPushStatus(req, res)
    }

    if (pathname === '/api/v1/owner/push/campaigns' && req.method === 'GET') {
      return handler.handleGetPushCampaigns(req, res)
    }

    if (pathname === '/api/v1/owner/push/campaigns' && req.method === 'POST') {
      return handler.handleCreatePushCampaign(req, res)
    }

    const campaignIdMatch = pathname.match(/^\/api\/v1\/owner\/push\/campaigns\/([^/]+)$/)
    if (campaignIdMatch && req.method === 'GET') {
      return handler.handleGetPushCampaign(req, res, campaignIdMatch[1])
    }

    const sendCampaignMatch = pathname.match(/^\/api\/v1\/owner\/push\/campaigns\/([^/]+)\/send$/)
    if (sendCampaignMatch && req.method === 'POST') {
      return handler.handleSendPushCampaign(req, res, sendCampaignMatch[1])
    }

    if (pathname === '/api/v1/owner/content' && req.method === 'GET') {
      return handler.handleGetContent(req, res)
    }

    if (pathname === '/api/v1/owner/content/draft' && req.method === 'GET') {
      return handler.handleGetContentDraft(req, res)
    }

    if (pathname === '/api/v1/owner/content/draft' && req.method === 'PUT') {
      return handler.handleSaveContentDraft(req, res)
    }

    if (pathname === '/api/v1/owner/content/draft' && req.method === 'DELETE') {
      return handler.handleDiscardContentDraft(req, res)
    }

    if (pathname === '/api/v1/owner/content/preview' && req.method === 'GET') {
      return handler.handleGetContentPreview(req, res)
    }

    if (pathname === '/api/v1/owner/content/publish' && req.method === 'POST') {
      return handler.handlePublishContent(req, res)
    }

    if (pathname === '/api/v1/owner/media' && req.method === 'GET') {
      return handler.handleGetMedia(req, res)
    }

    if (pathname === '/api/v1/owner/media' && req.method === 'POST') {
      return handler.handleUploadMedia(req, res)
    }

    const featuredMediaMatch = pathname.match(/^\/api\/v1\/owner\/media\/([^/]+)\/featured$/)
    if (featuredMediaMatch && req.method === 'POST') {
      return handler.handleSetFeaturedMedia(req, res, featuredMediaMatch[1])
    }

    if (pathname === '/api/v1/owner/media/featured' && req.method === 'DELETE') {
      return handler.handleRemoveFeaturedMedia(req, res)
    }

    const galleryAddMatch = pathname.match(/^\/api\/v1\/owner\/media\/([^/]+)\/gallery$/)
    if (galleryAddMatch && req.method === 'POST') {
      return handler.handleAddToGallery(req, res, galleryAddMatch[1])
    }

    const galleryRemoveMatch = pathname.match(/^\/api\/v1\/owner\/media\/([^/]+)\/gallery$/)
    if (galleryRemoveMatch && req.method === 'DELETE') {
      return handler.handleRemoveFromGallery(req, res, galleryRemoveMatch[1])
    }

    if (pathname === '/api/v1/owner/media/gallery' && req.method === 'PUT') {
      return handler.handleReorderGallery(req, res)
    }

    const deleteMediaMatch = pathname.match(/^\/api\/v1\/owner\/media\/([^/]+)$/)
    if (deleteMediaMatch && req.method === 'DELETE') {
      return handler.handleDeleteMedia(req, res, deleteMediaMatch[1])
    }

    const deleteSessionMatch = pathname.match(/^\/api\/v1\/owner\/sessions\/([^/]+)$/)
    if (deleteSessionMatch && req.method === 'DELETE') {
      return handler.handleRevokeSession(req, res, deleteSessionMatch[1])
    }

    res.statusCode = 404
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Not Found' }))
  }
}

export default {
  createOwnerAPIHandler,
  createOwnerRouter
}
