/**
 * Document Processor
 *
 * P12.3.2.3 — Media Processing Engine
 *
 * Document processing operations for PDF and Office files.
 */

export class DocumentProcessor {
  constructor() {
    this.pdfLoaded = false
    this.pdfParse = null
  }

  async loadPdfParse() {
    if (this.pdfLoaded) return true

    try {
      this.pdfParse = await import('pdf-parse')
      this.pdfLoaded = true
      return true
    } catch {
      console.warn('[DocumentProcessor] pdf-parse not available')
      return false
    }
  }

  async extractMetadata(buffer, mimeType) {
    if (mimeType === 'application/pdf') {
      return this.extractPdfMetadata(buffer)
    }

    return this.extractBasicDocumentMetadata(buffer, mimeType)
  }

  async extractPdfMetadata(buffer) {
    await this.loadPdfParse()

    if (!this.pdfParse) {
      return this.extractBasicDocumentMetadata(buffer, 'application/pdf')
    }

    try {
      const data = await this.pdfParse(buffer)

      return {
        title: data.info?.Title,
        author: data.info?.Author,
        subject: data.info?.Subject,
        keywords: data.info?.Keywords,
        creator: data.info?.Creator,
        producer: data.info?.Producer,
        creationDate: data.info?.CreationDate,
        modificationDate: data.info?.ModDate,
        pageCount: data.numpages,
        format: 'pdf',
        size: buffer.length,
        encrypted: data.info?.PDFFormatVersion?.includes('Encrypted'),
      }
    } catch (error) {
      console.error('[DocumentProcessor] PDF metadata extraction failed:', error.message)
      return this.extractBasicDocumentMetadata(buffer, 'application/pdf')
    }
  }

  extractBasicDocumentMetadata(buffer, mimeType) {
    return {
      format: mimeType.split('/')[1] || 'document',
      size: buffer.length,
      mimeType,
      pageCount: 1,
    }
  }

  async generatePreview(buffer, options = {}) {
    const { width = 800, format = 'png' } = options

    console.warn('[DocumentProcessor] PDF preview generation requires canvas/pdf2pic library')

    return {
      buffer: null,
      message: 'Preview generation requires pdf2pic or similar library',
      width,
      height: 0,
    }
  }

  async generateThumbnail(buffer, options = {}) {
    return this.generatePreview(buffer, { width: 256, ...options })
  }

  async extractText(buffer, mimeType) {
    if (mimeType !== 'application/pdf') {
      return { text: '', message: 'Text extraction only supported for PDF' }
    }

    await this.loadPdfParse()

    if (!this.pdfParse) {
      return { text: '', message: 'PDF parsing not available' }
    }

    try {
      const data = await this.pdfParse(buffer)
      return { text: data.text }
    } catch (error) {
      console.error('[DocumentProcessor] PDF text extraction failed:', error.message)
      return { text: '', error: error.message }
    }
  }

  async getPageCount(buffer, mimeType) {
    if (mimeType === 'application/pdf') {
      await this.loadPdfParse()
      if (this.pdfParse) {
        try {
          const data = await this.pdfParse(buffer)
          return data.numpages
        } catch {
          return 1
        }
      }
    }
    return 1
  }

  async isEncrypted(buffer, mimeType) {
    if (mimeType !== 'application/pdf') {
      return false
    }

    await this.loadPdfParse()

    if (!this.pdfParse) {
      return false
    }

    try {
      const data = await this.pdfParse(buffer)
      return data.info?.PDFFormatVersion?.includes('Encrypted') || false
    } catch {
      return false
    }
  }

  async extractMetadataForOffice(buffer, mimeType) {
    console.warn('[DocumentProcessor] Office document metadata requires additional libraries')

    return {
      format: this.getOfficeFormat(mimeType),
      size: buffer.length,
      mimeType,
      pageCount: 1,
      message: 'Office metadata extraction is future-ready',
    }
  }

  getOfficeFormat(mimeType) {
    const formats = {
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/vnd.ms-excel': 'xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'application/vnd.ms-powerpoint': 'ppt',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    }
    return formats[mimeType] || 'unknown'
  }

  healthCheck() {
    return {
      processor: 'document',
      pdfParse: this.pdfLoaded,
    }
  }
}

export default DocumentProcessor
