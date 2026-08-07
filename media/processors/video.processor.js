/**
 * Video Processor
 *
 * P12.3.2.3 — Media Processing Engine
 *
 * Video processing operations.
 * FFmpeg integration happens at the provider level.
 * This processor defines the interface contract.
 */

export class VideoProcessor {
  constructor() {
    this.ffmpegLoaded = false
    this.ffmpeg = null
  }

  async loadFFmpeg() {
    if (this.ffmpegLoaded) return true

    try {
      const ffmpegModule = await import('fluent-ffmpeg')
      this.ffmpeg = ffmpegModule.default
      this.ffmpegLoaded = true
      return true
    } catch {
      console.warn('[VideoProcessor] FFmpeg not available')
      return false
    }
  }

  async extractMetadata(buffer, mimeType) {
    await this.loadFFmpeg()

    if (!this.ffmpeg) {
      return this.extractBasicVideoMetadata(buffer, mimeType)
    }

    return new Promise((resolve) => {
      this.ffmpeg()
        .input(buffer)
        .inputFormat(this.getFormatFromMime(mimeType))
        .ffprobe((err, metadata) => {
          if (err) {
            console.error('[VideoProcessor] FFprobe failed:', err.message)
            resolve(this.extractBasicVideoMetadata(buffer, mimeType))
            return
          }

          const videoStream = metadata.streams?.find((s) => s.codec_type === 'video')
          const audioStream = metadata.streams?.find((s) => s.codec_type === 'audio')

          resolve({
            duration: metadata.format?.duration,
            bitrate: metadata.format?.bit_rate,
            format: metadata.format?.format_name,
            size: metadata.format?.size,
            video: videoStream
              ? {
                  codec: videoStream.codec_name,
                  width: videoStream.width,
                  height: videoStream.height,
                  frameRate: videoStream.r_frame_rate,
                  bitrate: videoStream.bit_rate,
                }
              : null,
            audio: audioStream
              ? {
                  codec: audioStream.codec_name,
                  sampleRate: audioStream.sample_rate,
                  channels: audioStream.channels,
                  bitrate: audioStream.bit_rate,
                }
              : null,
          })
        })
    })
  }

  extractBasicVideoMetadata(buffer, mimeType) {
    return {
      format: mimeType.split('/')[1],
      size: buffer.length,
      mimeType,
    }
  }

  async transcode(buffer, options = {}) {
    const { targetFormat = 'mp4', quality = 'medium' } = options

    await this.loadFFmpeg()

    if (!this.ffmpeg) {
      console.warn('[VideoProcessor] FFmpeg not available, transcoding skipped')
      return buffer
    }

    return new Promise((resolve, reject) => {
      const chunks = []

      this.ffmpeg()
        .input(buffer)
        .videoCodec(this.getVideoCodec(targetFormat))
        .audioCodec(this.getAudioCodec(targetFormat))
        .outputOptions(this.getQualityOptions(quality))
        .format(targetFormat)
        .on('data', (chunk) => chunks.push(chunk))
        .on('end', () => {
          resolve(Buffer.concat(chunks))
        })
        .on('error', (err) => {
          console.error('[VideoProcessor] Transcode failed:', err.message)
          reject(err)
        })
        .run()
    })
  }

  async generateThumbnail(buffer, options = {}) {
    const { timestamp = '00:00:01', width = 320, height = 180 } = options

    await this.loadFFmpeg()

    if (!this.ffmpeg) {
      console.warn('[VideoProcessor] FFmpeg not available, thumbnail skipped')
      return null
    }

    return new Promise((resolve, reject) => {
      this.ffmpeg()
        .input(buffer)
        .screenshots({
          timestamps: [timestamp],
          size: `${width}x${height}`,
        })
        .on('end', (filename) => {
          require('fs').readFile(filename, (err, data) => {
            if (err) {
              reject(err)
            } else {
              resolve(data)
            }
          })
        })
        .on('error', (err) => {
          console.error('[VideoProcessor] Thumbnail generation failed:', err.message)
          reject(err)
        })
    })
  }

  async generatePoster(buffer, options = {}) {
    return this.generateThumbnail(buffer, { timestamp: options.timestamp || '00:00:01' })
  }

  async prepareHLS(buffer, options = {}) {
    const { segmentLength = 10, qualityLevels = ['low', 'medium', 'high'] } = options

    await this.loadFFmpeg()

    if (!this.ffmpeg) {
      console.warn('[VideoProcessor] FFmpeg not available, HLS preparation skipped')
      return { playlist: null, segments: [] }
    }

    const qualityConfig = {
      low: { resolution: '640x360', bitrate: '500k' },
      medium: { resolution: '1280x720', bitrate: '1500k' },
      high: { resolution: '1920x1080', bitrate: '3000k' },
    }

    const outputs = []

    for (const level of qualityLevels) {
      const config = qualityConfig[level]
      if (!config) continue

      outputs.push(
        `-vf scale=${config.resolution} -b:v ${config.bitrate} -maxrate ${config.bitrate} -hls_time ${segmentLength} -hls_playlist_type vod -hls_segment_filename segment_%v_%03d.ts output_%v.m3u8`
      )
    }

    return {
      playlist: null,
      segments: [],
      qualityLevels,
      message: 'HLS preparation requires file system, use MediaService for full HLS generation',
    }
  }

  async prepareDASH(buffer, options = {}) {
    await this.loadFFmpeg()

    if (!this.ffmpeg) {
      console.warn('[VideoProcessor] FFmpeg not available, DASH preparation skipped')
      return { manifest: null }
    }

    return {
      manifest: null,
      message: 'DASH preparation requires file system, use MediaService for full DASH generation',
    }
  }

  async getDuration(buffer) {
    const metadata = await this.extractMetadata(buffer, 'video/mp4')
    return metadata.duration || 0
  }

  async getResolution(buffer) {
    const metadata = await this.extractMetadata(buffer, 'video/mp4')
    if (metadata.video) {
      return {
        width: metadata.video.width,
        height: metadata.video.height,
      }
    }
    return null
  }

  async getCodec(buffer) {
    const metadata = await this.extractMetadata(buffer, 'video/mp4')
    return {
      video: metadata.video?.codec,
      audio: metadata.audio?.codec,
    }
  }

  getFormatFromMime(mimeType) {
    const formatMap = {
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'video/quicktime': 'mov',
      'video/x-msvideo': 'avi',
      'video/x-matroska': 'mkv',
    }
    return formatMap[mimeType] || 'mp4'
  }

  getVideoCodec(format) {
    const codecMap = {
      mp4: 'libx264',
      webm: 'libvpx-vp9',
      mov: 'libx264',
    }
    return codecMap[format] || 'libx264'
  }

  getAudioCodec(format) {
    const codecMap = {
      mp4: 'aac',
      webm: 'libopus',
      mov: 'aac',
    }
    return codecMap[format] || 'aac'
  }

  getQualityOptions(quality) {
    const presets = {
      low: ['-preset fast', '-crf 28'],
      medium: ['-preset medium', '-crf 23'],
      high: ['-preset slow', '-crf 18'],
    }
    return presets[quality] || presets.medium
  }

  healthCheck() {
    return {
      processor: 'video',
      ffmpeg: this.ffmpegLoaded,
    }
  }
}

export default VideoProcessor
