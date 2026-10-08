import { test } from 'node:test'
import assert from 'node:assert'
import { createHtmlRenderer } from '../../web/rendering/html.renderer.js'

test('B1 - Renderer output regression: requested state branch present in generated HTML', () => {
  const renderer = createHtmlRenderer()
  
  // Render full page with booking enabled to get the inline script with status branching logic
  const html = renderer.render({
    booking: {
      enabled: true,
      slug: 'test-company',
      title: 'Reserva tu estadía',
    },
    destination: {
      name: 'Test Destination',
      slug: 'test-destination',
    },
    zone: 'destinos',
    identity: {
      applicationId: 'valdi.app/test',
      domain: 'valdi.app',
      route: '/test',
      company: 'test-company',
      destination: 'test',
    },
  })

  // The rendered HTML should contain the booking section with inline script
  // The script contains the confirmation logic with status branching
  assert.ok(html.includes('data-booking-confirmation'), 'confirmation region hook must be present')
  assert.ok(html.includes('data-booking-traveler-form'), 'traveler form hook must be present')
  
  // Check for the requested-state branch logic in the inline script
  assert.ok(html.includes("status === 'requested'"), "script must contain explicit requested status check")
  
  // Check for requested-state copy
  assert.ok(html.includes('Solicitud de reserva recibida'), "script must contain 'Solicitud de reserva recibida' copy")
  
  // Check that requested branch does NOT use confirmed copy
  const requestedBranchRegex = /status\s*===\s*['"]requested['"][^}]*?Solicitud de reserva recibida/
  assert.ok(requestedBranchRegex.test(html), 'requested branch must use request copy, not confirmed copy')
  
  // Check for confirmed-state branch
  assert.ok(html.includes("status === 'confirmed'"), "script must contain explicit confirmed status check")
  assert.ok(html.includes('Reserva confirmada'), "script must contain 'Reserva confirmada' copy for confirmed branch")
  
  // Verify the confirmed branch uses confirmed copy
  const confirmedBranchRegex = /status\s*===\s*['"]confirmed['"][^}]*?Reserva confirmada/
  assert.ok(confirmedBranchRegex.test(html), 'confirmed branch must use confirmed copy')
})

test('B2 - Renderer output: does not contain hardcoded "Reserva confirmada" for requested state', () => {
  const renderer = createHtmlRenderer()
  
  const html = renderer.render({
    booking: {
      enabled: true,
      slug: 'test-company',
      title: 'Reserva tu estadía',
    },
    destination: {
      name: 'Test Destination',
      slug: 'test-destination',
    },
    zone: 'destinos',
    identity: {
      applicationId: 'valdi.app/test',
      domain: 'valdi.app',
      route: '/test',
      company: 'test-company',
      destination: 'test',
    },
  })
  
  // The defect was: HTTP 201 with status=requested was shown as "Reserva confirmada"
  // The fix ensures requested branch uses different copy
  // Verify that the script structure has the branching
  
  // Find the requested branch and verify it doesn't contain "Reserva confirmada"
  const requestedIndex = html.indexOf("status === 'requested'")
  assert.ok(requestedIndex !== -1, 'requested branch must exist')
  
  const nextBranchIndex = html.indexOf("status === 'confirmed'", requestedIndex)
  const elseIndex = html.indexOf('else', requestedIndex)
  
  // Extract the requested branch body (between requested check and next branch/else)
  let branchEnd = html.length
  if (nextBranchIndex !== -1) branchEnd = nextBranchIndex
  if (elseIndex !== -1 && elseIndex < branchEnd) branchEnd = elseIndex
  
  const requestedBranch = html.slice(requestedIndex, branchEnd)
  assert.ok(requestedBranch.includes('Solicitud de reserva recibida'), 'requested branch must contain request copy')
  assert.ok(!requestedBranch.includes('Reserva confirmada'), 'requested branch must NOT contain confirmed copy')
  
  // Verify confirmed branch exists and uses confirmed copy
  const confirmedIndex = html.indexOf("status === 'confirmed'")
  assert.ok(confirmedIndex !== -1, 'confirmed branch must exist')
  
  let confirmedEnd = html.length
  const nextElseIndex = html.indexOf('else', confirmedIndex)
  if (nextElseIndex !== -1) confirmedEnd = nextElseIndex
  
  const confirmedBranch = html.slice(confirmedIndex, confirmedEnd)
  assert.ok(confirmedBranch.includes('Reserva confirmada'), 'confirmed branch must contain confirmed copy')
})