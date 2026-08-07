# Media Engine Architecture

## Overview

P12.3.2.3 implements the complete Media Processing Engine for Valdi Platform v4.2.

## Architecture

```
BusinessService
       ↓
MediaCapability
       ↓
MediaManager
       ↓
MediaEngine
       ↓
ProcessingPipeline
       ↓
┌─────────────────────────────────────────────┐
│  Processors: Image | Video | Audio | Document │
└─────────────────────────────────────────────┘
       ↓
StoragePlatform (Storage Capability)
       ↓
CDN Layer
```

## Components

| Component | Purpose | Location |
|-----------|---------|----------|
| MediaCapability | Entry point for capabilities | capabilities/media/ |
| MediaManager | Business logic orchestration | capabilities/media/ |
| MediaEngine | Core processing orchestration | media/ |
| MediaPipeline | Configurable processing stages | media/pipeline/ |
| ImageProcessor | Image operations | media/processors/ |
| VideoProcessor | Video operations | media/processors/ |
| AudioProcessor | Audio operations | media/processors/ |
| DocumentProcessor | Document operations | media/processors/ |
| MetadataEngine | Metadata extraction | media/engine/ |
| VariantGenerator | Responsive variants | media/responsive/ |
| CDNLayer | CDN abstraction | media/cdn/ |
| MediaQueue | Async job processing | media/queue/ |

## Supported Media Types

### Images
- JPEG, PNG, WebP, AVIF, GIF, SVG
- Resize, crop, smart crop, rotate, flip
- Compression, format conversion
- Watermark, blur
- Orientation fix
- EXIF manipulation

### Video
- MP4, WebM, QuickTime
- Thumbnail extraction
- Poster generation
- Transcoding (future)
- HLS preparation (future)
- DASH preparation (future)

### Audio
- MP3, WAV, OGG, AAC, FLAC
- Metadata extraction
- Waveform generation (future)
- Normalization (future)

### Documents
- PDF
- Office formats (future)
- Preview generation
- Text extraction

## Database Schema

- `media_assets` - Core media records
- `media_variants` - Generated variants
- `media_metadata` - Technical metadata
- `media_jobs` - Processing queue
- `media_relationships` - Parent-child relationships
- `media_permissions` - Access control
- `media_lifecycle` - Lifecycle tracking

## Events

| Event | Trigger |
|-------|---------|
| media.uploaded | Successful upload |
| media.processing | Processing started |
| media.processed | Processing completed |
| media.optimized | Optimization completed |
| media.variants.created | Variants generated |
| media.deleted | Media deleted |
| media.failed | Processing failed |
| media.stream.ready | Streaming ready |
| media.metadata.updated | Metadata updated |
| media.queue.added | Job queued |
| media.queue.completed | Job completed |
| media.queue.failed | Job failed |

## Configuration

```javascript
{
  pipeline: {
    validation: { enabled: true, maxSize: 100MB },
    metadataExtraction: { enabled: true },
    orientationFix: { enabled: true },
    resize: { enabled: true },
    compression: { enabled: true, quality: 85 },
    formatConversion: { enabled: true },
    watermark: { enabled: false },
    thumbnail: { enabled: true, sizes: [64, 128, 256] },
    storage: { enabled: true },
    cdn: { enabled: true },
    database: { enabled: true },
  },
  variants: {
    original: { width: null, quality: 100 },
    large: { width: 1920, quality: 90 },
    medium: { width: 1280, quality: 85 },
    small: { width: 640, quality: 80 },
    thumbnail: { width: 256, quality: 75 },
  },
  cdn: {
    provider: 'cloudflare',
    accountId: '...',
  }
}
```

## Guardian Validation

MediaGuardian validates:
- No direct Sharp/FFmpeg usage outside media layer
- No direct CDN SDK usage in capabilities
- No filesystem bypass in processors
- Storage Platform integration
- Event generation
- Database schema existence
