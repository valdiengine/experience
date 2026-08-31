#!/bin/bash
set -e

STAGE_URL="https://stage.valdi.app"
AUTH_URL="${STAGE_URL}/api/v1/owner/login"
CREATE_URL="${STAGE_URL}/api/v1/owner/push/campaigns"
NODE_BIN="/home/rodrigo/nodevenv/turistic-stage/22/bin/node"

if [ ! -x "${NODE_BIN}" ]; then
  echo "ERROR: Node runtime not available at ${NODE_BIN}"
  exit 1
fi

handle_response() {
  local file="$1"
  local label="$2"

  if [ ! -f "$file" ]; then
    echo "[$label] BODY_MISSING (file does not exist)"
    return
  fi

  local size=$(wc -c < "$file" 2>/dev/null || echo "0")
  if [ "$size" -eq 0 ] 2>/dev/null; then
    echo "[$label] BODY_EMPTY (0 bytes)"
    return
  fi

  local content=$(cat "$file")
  if [ -z "$content" ]; then
    echo "[$label] BODY_EMPTY (empty after cat)"
    return
  fi

  local first_char=$(head -c 1 "$file" 2>/dev/null)
  if [ "$first_char" != "{" ] && [ "$first_char" != "[" ]; then
    echo "[$label] BODY_NON_JSON:"
    echo "$content" | "${NODE_BIN}" -e "
      const fs = require('fs');
      const input = fs.readFileSync(0, 'utf8').substring(0, 500);
      const sanitized = input
        .replace(/Bearer [^&\\s]*/g, 'Bearer [REDACTED]')
        .replace(/password[^\&\\s]*/gi, 'password=[REDACTED]')
        .replace(/\"auth\"\\s*:\\s*\"[^\"]+\"/g, '\"auth\": \"[REDACTED]\"')
        .replace(/\"p256dh\"\\s*:\\s*\"[^\"]+\"/g, '\"p256dh\": \"[REDACTED]\"')
        .replace(/\"endpoint\"\\s*:\\s*\"[^\"]+\"/g, '\"endpoint\": \"[REDACTED]\"')
        .replace(/\"session\"\\s*:\\s*\{[^}]+\}/g, '\"session\": { \"id\": \"[REDACTED]\" }');
      console.log(sanitized);
    "
    return
  fi

  "${NODE_BIN}" -e "
    const fs = require('fs');
    const content = fs.readFileSync('${file}', 'utf8');
    let d;
    try {
      d = JSON.parse(content);
    } catch (e) {
      console.log('[${label}] BODY_JSON_INVALID: ' + e.message);
      return;
    }
    const safeFields = ['success', 'error', 'message', 'campaign', 'delivery', 'status', 'environment', 'applicationId', 'title', 'body', 'url', 'id', 'attempted', 'sent', 'failed', 'expired', 'audienceCount', 'createdAt', 'sentAt', 'name', 'email'];
    function copySafe(src, dest) {
      if (src && typeof src === 'object') {
        for (const key of Object.keys(src)) {
          if (safeFields.includes(key) || (key === 'campaign' && typeof src[key] === 'object')) {
            if (Array.isArray(src[key])) {
              dest[key] = src[key].map(function(item) {
                if (item && typeof item === 'object') {
                  const out = {};
                  for (const k of Object.keys(item)) {
                    if (safeFields.includes(k)) out[k] = item[k];
                  }
                  return out;
                }
                return item;
              });
            } else if (typeof src[key] === 'object') {
              dest[key] = {};
              copySafe(src[key], dest[key]);
            } else {
              dest[key] = src[key];
            }
          }
        }
      }
    }
    const sanitized = {};
    copySafe(d, sanitized);
    console.log('[${label}] BODY_JSON:');
    console.log(JSON.stringify(sanitized, null, 2));
  "
}

echo "=== PUSH-4.2 Physical Certification ==="
echo ""

read -r -p "Owner email: " EMAIL
read -s -r -p "Password: " PASSWORD
echo ""

# === STEP 1: LOGIN ===
echo "[1/4] Logging in..."

LOGIN_HTTP=$(curl -s -o /tmp/login_body.json -w "%{http_code}" -X POST "${AUTH_URL}" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")

unset PASSWORD

if [ "${LOGIN_HTTP}" != "200" ]; then
  echo "ERROR: Login failed with HTTP ${LOGIN_HTTP}"
  handle_response /tmp/login_body.json "LOGIN"
  rm -f /tmp/login_body.json
  exit 1
fi

SESSION=$( "${NODE_BIN}" -e "
  const d = JSON.parse(require('fs').readFileSync('/tmp/login_body.json', 'utf8'));
  if (!d.success) { console.error('Login failed:', JSON.stringify(d)); process.exit(1); }
  if (!d.session || !d.session.id) { console.error('No session id in response'); process.exit(1); }
  if (d.session.applicationId !== 'valdi.app/albasie') { console.error('Wrong application:', d.session.applicationId); process.exit(1); }
  console.log(d.session.id);
")

rm -f /tmp/login_body.json

echo "    Logged in as ${EMAIL}"
echo "    Application: valdi.app/albasie"
echo ""

# === STEP 2: CREATE CAMPAIGN ===
echo "[2/4] Creating campaign..."

CREATE_HTTP=$(curl -s -o /tmp/create_body.json -w "%{http_code}" -X POST "${CREATE_URL}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SESSION}" \
  -d '{
    "title": "Albasie",
    "body": "PUSH-4 Turistic OS - campaña oficial de prueba",
    "url": "/albasie/"
  }')

if [ "${CREATE_HTTP}" != "201" ]; then
  echo "ERROR: Create campaign failed with HTTP ${CREATE_HTTP}"
  handle_response /tmp/create_body.json "CREATE"
  rm -f /tmp/create_body.json /tmp/send_body.json
  exit 1
fi

CAMPAIGN_ID=$( "${NODE_BIN}" -e "
  const d = JSON.parse(require('fs').readFileSync('/tmp/create_body.json', 'utf8'));
  if (!d.success) { console.error('Create failed:', JSON.stringify(d)); process.exit(1); }
  if (!d.campaign || !d.campaign.id) { console.error('No campaign.id in response'); process.exit(1); }
  if (d.campaign.environment !== 'staging') { console.error('Wrong environment:', d.campaign.environment); process.exit(1); }
  if (d.campaign.applicationId !== 'valdi.app/albasie') { console.error('Wrong applicationId:', d.campaign.applicationId); process.exit(1); }
  if (d.campaign.status !== 'draft') { console.error('Wrong status:', d.campaign.status); process.exit(1); }
  console.log(d.campaign.id);
" 2>&1) || {
  echo "ERROR: Failed to parse create response"
  handle_response /tmp/create_body.json "CREATE"
  rm -f /tmp/create_body.json /tmp/send_body.json
  exit 1
}

rm -f /tmp/create_body.json

echo "    campaignId: ${CAMPAIGN_ID}"
echo "    environment: staging (verified)"
echo "    applicationId: valdi.app/albasie (verified)"
echo "    status: draft (verified)"
echo ""

# === STEP 3: CONFIRM BEFORE SEND ===
read -r -p "[3/4] CONFIRM: Send campaign ${CAMPAIGN_ID} to Albasie staging subscription? (yes/no): " CONFIRM

if [ "${CONFIRM}" != "yes" ]; then
  echo "Aborted. Campaign ${CAMPAIGN_ID} remains in 'draft' state."
  rm -f /tmp/campaign_id.txt
  exit 0
fi

# === STEP 4: SEND CAMPAIGN ===
echo "[4/4] Sending campaign..."

SEND_HTTP=$(curl -s -o /tmp/send_body.json -w "%{http_code}" -X POST "${STAGE_URL}/api/v1/owner/push/campaigns/${CAMPAIGN_ID}/send" \
  -H "Authorization: Bearer ${SESSION}" \
  -H "Content-Type: application/json" \
  -d '{}')

if [ "${SEND_HTTP}" != "200" ]; then
  echo "ERROR: Send campaign failed with HTTP ${SEND_HTTP}"
  handle_response /tmp/send_body.json "SEND"
  rm -f /tmp/send_body.json
  exit 1
fi

"${NODE_BIN}" -e "
  const d = JSON.parse(require('fs').readFileSync('/tmp/send_body.json', 'utf8'));
  const checks = [];

  if (d.success !== true) checks.push('success !== true');
  if (!d.campaign) checks.push('campaign missing');
  if (d.campaign && d.campaign.environment !== 'staging') checks.push('campaign.environment !== staging');
  if (d.campaign && d.campaign.applicationId !== 'valdi.app/albasie') checks.push('campaign.applicationId !== valdi.app/albasie');
  if (!d.delivery) checks.push('delivery missing');
  if (d.delivery && d.delivery.attempted !== 1) checks.push('delivery.attempted !== 1');
  if (d.delivery && d.delivery.sent !== 1) checks.push('delivery.sent !== 1');
  if (d.delivery && d.delivery.failed !== 0) checks.push('delivery.failed !== 0');

  if (checks.length > 0) {
    console.error('VALIDATION FAILED:');
    checks.forEach(function(c) { console.error('  - ' + c); });
    process.exit(1);
  }

  console.log('=== SEND VALIDATION PASSED ===');
  console.log('success:', d.success);
  console.log('campaign.status:', d.campaign.status);
  console.log('campaign.environment:', d.campaign.environment);
  console.log('campaign.applicationId:', d.campaign.applicationId);
  console.log('delivery.attempted:', d.delivery.attempted);
  console.log('delivery.sent:', d.delivery.sent);
  console.log('delivery.failed:', d.delivery.failed);
"

SEND_RESULT=$?

rm -f /tmp/send_body.json

if [ ${SEND_RESULT} -ne 0 ]; then
  echo "ERROR: Send response validation failed"
  exit 1
fi

echo ""
echo "=== Campaign ${CAMPAIGN_ID} sent and validated ==="
echo ""
echo "VERIFICATION:"
echo "  A. Campaign file: data/push-campaigns/staging/valdi.app_albasie/campaigns/${CAMPAIGN_ID}.json"
echo "  B. Check index:  data/push-campaigns/staging/valdi.app_albasie/campaigns/index.json"
echo "  C. Subscription: GET /api/v1/push/status (environment=staging, active=1)"
echo "  D. Physical:    Confirm OS/browser notification appeared:"
echo "                      Title: Albasie"
echo "                      Body:  PUSH-4 Turistic OS - campaña oficial de prueba"
echo ""

SESSION=""
exit 0
