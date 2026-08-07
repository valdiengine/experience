# Media Pipeline

## Overview

Configurable processing pipeline with optional stages.

## Default Pipeline Stages

```
Upload
       ↓
Validation
       ↓
Metadata Extraction
       ↓
Orientation Fix
       ↓
Resize
       ↓
Compression
       ↓
Format Conversion
       ↓
Watermark (optional)
       ↓
Thumbnail Generation
       ↓
Storage
       ↓
CDN
       ↓
Database Registration
       ↓
Events
```

## Stage Configuration

Each stage can be enabled/disabled:

```javascript
const pipeline = new MediaPipeline({
  validation: { enabled: true, maxSize: 100 * 1024 * 1024 },
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
  events: { enabled: true },
})
```

## Stage Handlers

### Validation Stage
- Validates buffer is not empty
- Checks file size against maxSize
- Validates MIME type is supported

### Metadata Extraction Stage
- Extracts dimensions, duration, codec
- Generates checksum
- Creates fingerprint

### Orientation Fix Stage
- Auto-rotates based on EXIF orientation
- Only for images

### Resize Stage
- Resizes to specified dimensions
- Supports fit modes: inside, cover, contain

### Compression Stage
- JPEG quality optimization
- PNG compression
- WebP/AVIF compression

### Format Conversion Stage
- Converts between formats
- Preserves quality settings

### Watermark Stage
- Adds text watermark
- Configurable position, opacity, font size

### Thumbnail Generation Stage
- Generates multiple sizes
- Default: 64, 128, 256px

## Error Handling

Pipeline continues on error if `continueOnError: true`:

```javascript
const result = await pipeline.execute(assetData, {
  continueOnError: true
})
```

Errors are collected in result.errors array.

## Custom Stages

Add custom stages:

```javascript
pipeline.addStage({
  name: 'customStage',
  enabled: true,
  handler: async (context, options) => {
    // Custom processing
    return { customData: 'value' }
  }
})
```
