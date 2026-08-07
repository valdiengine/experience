# Video Processing

## Supported Formats

- MP4
- WebM
- QuickTime
- AVI
- MKV

## Operations

### Metadata Extraction

```javascript
const metadata = await videoProcessor.extractMetadata(buffer, mimeType)
// Returns: duration, bitrate, format, size, video codec, audio codec
```

### Thumbnail Extraction

```javascript
const thumbnail = await videoProcessor.generateThumbnail(buffer, {
  timestamp: '00:00:01',
  width: 320,
  height: 180
})
```

### Poster Generation

```javascript
const poster = await videoProcessor.generatePoster(buffer, {
  timestamp: '00:00:05'
})
```

### Transcoding

```javascript
const transcoded = await videoProcessor.transcode(buffer, {
  targetFormat: 'mp4',
  quality: 'medium'
})
```

### HLS Preparation

```javascript
const hls = await videoProcessor.prepareHLS(buffer, {
  segmentLength: 10,
  qualityLevels: ['low', 'medium', 'high']
})
```

### DASH Preparation

```javascript
const dash = await videoProcessor.prepareDASH(buffer)
```

## FFmpeg Integration

VideoProcessor uses FFmpeg when available:

```javascript
async loadFFmpeg() {
  try {
    const ffmpegModule = await import('fluent-ffmpeg')
    this.ffmpeg = ffmpegModule.default
    return true
  } catch {
    console.warn('FFmpeg not available')
    return false
  }
}
```

## Quality Presets

| Preset | CRF | Speed |
|--------|-----|-------|
| low | 28 | fast |
| medium | 23 | medium |
| high | 18 | slow |

## Video Codecs

| Format | Video Codec | Audio Codec |
|--------|------------|------------|
| MP4 | libx264 | aac |
| WebM | libvpx-vp9 | libopus |
