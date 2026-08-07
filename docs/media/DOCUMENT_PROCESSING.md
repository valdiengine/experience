# Document Processing

## Supported Formats

- PDF
- Microsoft Word (future)
- Microsoft Excel (future)
- Microsoft PowerPoint (future)

## PDF Operations

### Metadata Extraction

```javascript
const metadata = await documentProcessor.extractPdfMetadata(buffer)
// Returns: title, author, subject, keywords, creator, producer,
//          creationDate, modificationDate, pageCount, encrypted
```

### Preview Generation

```javascript
const preview = await documentProcessor.generatePreview(buffer, {
  width: 800,
  format: 'png'
})
```

### Thumbnail Generation

```javascript
const thumbnail = await documentProcessor.generateThumbnail(buffer, {
  width: 256
})
```

### Text Extraction

```javascript
const text = await documentProcessor.extractText(buffer)
// Returns: { text: '...' }
```

### Page Count

```javascript
const pages = await documentProcessor.getPageCount(buffer, mimeType)
```

### Encryption Check

```javascript
const encrypted = await documentProcessor.isEncrypted(buffer, mimeType)
```

## Office Document Support (Future)

```javascript
// Office metadata extraction is future-ready
const metadata = await documentProcessor.extractMetadataForOffice(buffer, mimeType)
```

## Library Requirements

Document processing requires:
- `pdf-parse` for PDF metadata and text extraction
- `pdf2pic` or `canvas` for preview/thumbnail generation
