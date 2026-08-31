/**
 * PUSH-4.2 CAMPAIGN SEND DIAGNOSTIC TEST
 *
 * Tests campaign persistence and send WITHOUT PostgreSQL.
 * Simulates cross-process scenario: create with one persistence instance,
 * retrieve/send with another (Map empty).
 *
 * Run: node web/push-4.2-diagnostic.test.js
 */

import { tmpdir } from 'os'
import { join } from 'path'
import { existsSync, mkdirSync, rmSync } from 'fs'
import assert from 'node:assert'

const TEST_APPLICATION_ID = 'valdi.app/albasie'
const TEST_ENVIRONMENT = 'staging'

const TEST_ID = `push42-diag-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
const PUSH_TEST_DIR = join(tmpdir(), `push-subscriptions-${TEST_ID}`)
const CAMPAIGN_TEST_DIR = join(tmpdir(), `push-campaigns-${TEST_ID}`)

async function runTests() {
  console.log('PUSH-4.2 Campaign Send Diagnostic')
  console.log(`Test ID: ${TEST_ID}`)
  console.log(`Campaign Storage: ${CAMPAIGN_TEST_DIR}`)
  console.log('=================\n')

  let passed = 0
  let failed = 0

  mkdirSync(PUSH_TEST_DIR, { recursive: true })
  mkdirSync(CAMPAIGN_TEST_DIR, { recursive: true })

  try {
    const { createPushCampaignPersistence } = await import('./business/push/persistence/push.campaign.persistence.js')
    const { createPushCampaignService } = await import('./business/push/push.campaign.service.js')
    const { createPushSubscriptionPersistence } = await import('./business/push/persistence/push.subscription.persistence.js')
    const { createPushSubscriptionService } = await import('./business/push/push.subscription.service.js')

    // Instance A: simulates worker that CREATES the campaign
    const persistenceA = createPushCampaignPersistence({ basePath: CAMPAIGN_TEST_DIR })
    const subscriptionPersistenceA = createPushSubscriptionPersistence({ basePath: PUSH_TEST_DIR })
    const subscriptionServiceA = createPushSubscriptionService({ persistence: subscriptionPersistenceA })
    const serviceA = createPushCampaignService({
      campaignPersistence: persistenceA,
      subscriptionPersistence: subscriptionPersistenceA
    })

    // Instance B: simulates worker that SENDS the campaign (Map empty, must read from filesystem)
    const persistenceB = createPushCampaignPersistence({ basePath: CAMPAIGN_TEST_DIR })
    const subscriptionPersistenceB = createPushSubscriptionPersistence({ basePath: PUSH_TEST_DIR })
    const subscriptionServiceB = createPushSubscriptionService({ persistence: subscriptionPersistenceB })
    const serviceB = createPushCampaignService({
      campaignPersistence: persistenceB,
      subscriptionPersistence: subscriptionPersistenceB
    })

    // Pre-register a subscription so we have audience
    const subResult = await subscriptionServiceA.register(
      TEST_ENVIRONMENT,
      TEST_APPLICATION_ID,
      {
        endpoint: `https://example.com/sub-${TEST_ID}`,
        keys: { p256dh: 'test-p256dh', auth: 'test-auth' }
      }
    )
    console.log(`[Setup] Subscription registered: ${subResult.success}`)

    // Test 1: Service A creates campaign
    console.log('\n--- Test 1: Create campaign with Service A ---')
    try {
      const createResult = await serviceA.create(
        TEST_ENVIRONMENT,
        TEST_APPLICATION_ID,
        { title: 'Diagnostic Test', body: 'Testing cross-process send', url: '/albasie/' },
        'test@example.com',
        TEST_APPLICATION_ID
      )
      console.log(`    createResult: ${JSON.stringify(createResult)}`)
      assert.strictEqual(createResult.success, true, 'Campaign creation should succeed')
      assert.strictEqual(createResult.campaign.status, 'draft', 'New campaign should be draft')
      assert.strictEqual(createResult.campaign.environment, TEST_ENVIRONMENT, 'Environment should match')
      assert.strictEqual(createResult.campaign.applicationId, TEST_APPLICATION_ID, 'ApplicationId should match')
      console.log(`  PASS: Campaign created with ID: ${createResult.campaign.id}`)
      passed++
    } catch (e) {
      console.log(`  FAIL: ${e.message}`)
      failed++
    }

    const campaignId = (await serviceA.create(
      TEST_ENVIRONMENT,
      TEST_APPLICATION_ID,
      { title: 'For Send Test', body: 'Testing', url: '/albasie/' },
      'test@example.com',
      TEST_APPLICATION_ID
    )).campaign.id

    // Test 2: Service B retrieves campaign from FILESYSTEM (Map empty)
    console.log('\n--- Test 2: Retrieve with Service B (fresh Map) ---')
    try {
      const retrieveResult = await serviceB.get(TEST_ENVIRONMENT, TEST_APPLICATION_ID, campaignId)
      assert.strictEqual(retrieveResult.success, true, 'Campaign retrieval should succeed')
      assert.strictEqual(retrieveResult.campaign.id, campaignId, 'Campaign ID should match')
      assert.strictEqual(retrieveResult.campaign.environment, TEST_ENVIRONMENT, 'Environment should match')
      assert.strictEqual(retrieveResult.campaign.applicationId, TEST_APPLICATION_ID, 'ApplicationId should match')
      assert.strictEqual(retrieveResult.campaign.status, 'draft', 'Status should still be draft')
      console.log(`  PASS: Campaign retrieved by Service B from filesystem`)
      passed++
    } catch (e) {
      console.log(`  FAIL: ${e.message}`)
      failed++
    }

    // Test 3: Service B sends campaign
    console.log('\n--- Test 3: Send campaign with Service B ---')
    try {
      const mockAdapter = {
        async send(context, notification) {
          console.log(`    [MockAdapter] send() called with notification.id: ${notification.id}`)
          return { attempted: 1, sent: 1, failed: 0, expired: 0 }
        }
      }

      const sendResult = await serviceB.send(TEST_ENVIRONMENT, TEST_APPLICATION_ID, campaignId, mockAdapter)
      console.log(`    sendResult.success: ${sendResult.success}`)
      console.log(`    sendResult.error: ${sendResult.error || 'none'}`)
      if (sendResult.campaign) {
        console.log(`    campaign.status: ${sendResult.campaign.status}`)
      }
      if (sendResult.delivery) {
        console.log(`    delivery: attempted=${sendResult.delivery.attempted}, sent=${sendResult.delivery.sent}, failed=${sendResult.delivery.failed}`)
      }

      assert.strictEqual(sendResult.success, true, 'Send should succeed')
      assert.strictEqual(sendResult.campaign.status, 'sent', 'Campaign status should be sent')
      assert.strictEqual(sendResult.delivery.sent, 1, 'Should have 1 sent')
      console.log(`  PASS: Campaign sent successfully`)
      passed++
    } catch (e) {
      console.log(`  FAIL: ${e.message}`)
      failed++
    }

    // Test 4: Verify campaign file exists on filesystem
    console.log('\n--- Test 4: Verify persistence file ---')
    try {
      const campaignFile = join(CAMPAIGN_TEST_DIR, TEST_ENVIRONMENT, TEST_APPLICATION_ID.replace('/', '_'), 'campaigns', `${campaignId}.json`)
      console.log(`    Checking: ${campaignFile}`)
      assert.strictEqual(existsSync(campaignFile), true, 'Campaign file should exist')
      console.log(`  PASS: Campaign file exists`)
      passed++
    } catch (e) {
      console.log(`  FAIL: ${e.message}`)
      failed++
    }

    // Test 5: Verify status after send
    console.log('\n--- Test 5: Retrieve status after send ---')
    try {
      const retrieveResult = await serviceA.get(TEST_ENVIRONMENT, TEST_APPLICATION_ID, campaignId)
      assert.strictEqual(retrieveResult.success, true, 'Campaign retrieval should succeed')
      assert.strictEqual(retrieveResult.campaign.status, 'sent', 'Campaign should be marked as sent')
      assert.strictEqual(retrieveResult.campaign.sent, 1, 'Should have sent=1')
      console.log(`  PASS: Campaign status verified as sent`)
      passed++
    } catch (e) {
      console.log(`  FAIL: ${e.message}`)
      failed++
    }

  } catch (error) {
    console.error('Test setup error:', error)
    failed++
  } finally {
    try { rmSync(PUSH_TEST_DIR, { recursive: true }) } catch {}
    try { rmSync(CAMPAIGN_TEST_DIR, { recursive: true }) } catch {}
  }

  console.log('\n=================')
  console.log(`Results: ${passed} passed, ${failed} failed`)
  console.log('=================')

  process.exit(failed > 0 ? 1 : 0)
}

runTests().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
