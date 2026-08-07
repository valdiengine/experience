# Media Events

## Overview

Media layer emits events for all significant operations.

## Event Definitions

```javascript
export const MEDIA_EVENTS = {
  MEDIA_UPLOADED: 'media.uploaded',
  MEDIA_PROCESSING: 'media.processing',
  MEDIA_PROCESSED: 'media.processed',
  MEDIA_OPTIMIZED: 'media.optimized',
  MEDIA_VARIANTS_CREATED: 'media.variants.created',
  MEDIA_DELETED: 'media.deleted',
  MEDIA_FAILED: 'media.failed',
  MEDIA_STREAM_READY: 'media.stream.ready',
  MEDIA_METADATA_UPDATED: 'media.metadata.updated',
  MEDIA_CDN_PURGED: 'media.cdn.purged',
  MEDIA_QUEUE_ADDED: 'media.queue.added',
  MEDIA_QUEUE_COMPLETED: 'media.queue.completed',
  MEDIA_QUEUE_FAILED: 'media.queue.failed',
}
```

## Event Payloads

### media.uploaded

Emitted when media is uploaded.

```javascript
{
  event: 'media.uploaded',
  timestamp: '2024-01-15T10:30:00.000Z',
  data: {
    fileName: 'photo.jpg',
    mimeType: 'image/jpeg',
    tenantId: 'uuid',
    mediaId: 'uuid'
  }
}
```

### media.processing

Emitted when processing starts.

```javascript
{
  event: 'media.processing',
  timestamp: '2024-01-15T10:30:01.000Z',
  data: {
    mediaId: 'uuid',
    pipeline: 'default'
  }
}
```

### media.processed

Emitted when processing completes.

```javascript
{
  event: 'media.processed',
  timestamp: '2024-01-15T10:30:05.000Z',
  data: {
    mediaId: 'uuid',
    processingTime: 4000
  }
}
```

### media.variants.created

Emitted when variants are generated.

```javascript
{
  event: 'media.variants.created',
  timestamp: '2024-01-15T10:30:06.000Z',
  data: {
    mediaId: 'uuid',
    variants: ['large', 'medium', 'small', 'thumbnail']
  }
}
```

### media.deleted

Emitted when media is deleted.

```javascript
{
  event: 'media.deleted',
  timestamp: '2024-01-15T11:00:00.000Z',
  data: {
    mediaId: 'uuid',
    tenantId: 'uuid'
  }
}
```

### media.failed

Emitted when processing fails.

```javascript
{
  event: 'media.failed',
  timestamp: '2024-01-15T10:30:00.000Z',
  data: {
    mediaId: 'uuid',
    fileName: 'photo.jpg',
    error: 'File too large',
    tenantId: 'uuid'
  }
}
```

### media.metadata.updated

Emitted when metadata is updated.

```javascript
{
  event: 'media.metadata.updated',
  timestamp: '2024-01-15T12:00:00.000Z',
  data: {
    mediaId: 'uuid',
    metadata: { title: 'New Title' },
    updatedBy: 'user-uuid'
  }
}
```

### media.queue.added

Emitted when job is queued.

```javascript
{
  event: 'media.queue.added',
  timestamp: '2024-01-15T10:30:00.000Z',
  data: {
    jobId: 'media_job_xxx',
    status: 'pending'
  }
}
```

### media.queue.completed

Emitted when job completes.

```javascript
{
  event: 'media.queue.completed',
  timestamp: '2024-01-15T10:30:05.000Z',
  data: {
    jobId: 'media_job_xxx',
    progress: 100
  }
}
```

## Event Subscription

```javascript
eventBus.subscribe('media.uploaded', (event) => {
  console.log('Media uploaded:', event.data.mediaId)
})
```
