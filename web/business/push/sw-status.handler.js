// Diagnostic endpoint to check SW status
// Access via: http://127.0.0.1:3001/api/v1/push/sw-status

export function handleGetSWStatus(req, res) {
  const swStatus = {
    timestamp: new Date().toISOString(),
    serviceWorkerUrl: '/sw-valdi_app_albasie.js',
    scope: '/albasie/',
    registered: true,
    diagnostic: 'If SW is running, check DevTools Console for [SW] ping response'
  };

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(swStatus, null, 2));
}
