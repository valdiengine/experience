# Image Processing

## Supported Formats

- JPEG/JPG
- PNG
- WebP
- AVIF
- GIF
- SVG (passthrough)

## Operations

### Resize

```javascript
const resized = await imageProcessor.resize(buffer, {
  width: 1920,
  height: 1080,
  fit: 'inside', // inside, cover, contain
  position: 'center'
})
```

### Crop

```javascript
const cropped = await imageProcessor.crop(buffer, {
  width: 800,
  height: 600,
  left: 100,
  top: 50
})
```

### Smart Crop

```javascript
const smartCropped = await imageProcessor.smartCrop(buffer, {
  width: 400,
  height: 400
})
```

### Rotate

```javascript
const rotated = await imageProcessor.rotate(buffer, 90)
```

### Flip

```javascript
const flipped = await imageProcessor.flip(buffer)
```

### Auto Orient

```javascript
const oriented = await imageProcessor.autoOrient(buffer, orientation)
```

### Compression

```javascript
// JPEG
const compressed = await imageProcessor.compressJpeg(buffer, 85)

// PNG
const pngCompressed = await imageProcessor.compressPng(buffer)

// WebP
const webpCompressed = await imageProcessor.compressWebp(buffer, {
  quality: 85,
  lossless: false
})
```

### Format Conversion

```javascript
const converted = await imageProcessor.convertFormat(buffer, 'webp')
```

### Watermark

```javascript
const watermarked = await imageProcessor.addWatermark(buffer, {
  text: 'Copyright 2024',
  position: 'southeast',
  opacity: 0.3,
  fontSize: 24
})
```

### Blur

```javascript
const blurred = await imageProcessor.blur(buffer, 5)
```

## Metadata Extraction

```javascript
const metadata = await imageProcessor.extractMetadata(buffer, mimeType)
// Returns: width, height, format, aspectRatio, dominantColors, etc.
```

## Dominant Colors

```javascript
const color = await imageProcessor.getDominantColor(buffer)
// Returns: 'rgb(123,45,67)'
```

## Aspect Ratio Detection

```javascript
const ratio = await imageProcessor.detectAspectRatio(buffer)
// Returns: 1.777 (16:9)
```

## EXIF Removal

```javascript
const cleaned = await imageProcessor.removeExif(buffer)
```

## Integration with Sharp

ImageProcessor uses Sharp when available, falls back gracefully when not:

```javascript
async loadSharp() {
  try {
    this.sharp = await import('sharp')
    return true
  } catch {
    console.warn('Sharp not available')
    return false
  }
}
```
