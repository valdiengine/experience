## Communication Capability

Multi-channel messaging with provider-based architecture.

### Structure

```
communication/
├── communication.capability.js  — Main capability
├── communication.schema.js      — Data schemas
├── communication.events.js      — Event definitions
├── providers/
│   ├── whatsapp.provider.js     — WhatsApp Business API
│   ├── chat.provider.js         — Web Chat
│   ├── email.provider.js        — Email service
│   └── push.provider.js         — Push notifications
└── README.md
```

### Architecture

```
CommunicationCapability
  ├── WhatsAppProvider
  ├── ChatProvider
  ├── EmailProvider
  └── PushProvider
```

### Usage

```js
await communication.send({
  channel: 'whatsapp',
  recipient: 'owner_123',
  body: 'New booking request from John Doe',
})
```

### Business-agnostic

- No knowledge of tourism, drones, etc.
- Channels are generic: whatsapp, chat, email, push
- Messages are generic: { recipient, body, subject, metadata }
