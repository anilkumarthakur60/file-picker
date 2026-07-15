import { describe, it, expect } from 'vitest'
import { formatSize, truncate, mediaTypeFromMime, getFileIcon, extensionOf, isImage } from '../src'
import type { MediaItem } from '../src'

const item = (over: Partial<MediaItem>): MediaItem => ({
  id: 1,
  folderId: null,
  filename: 'f.png',
  extension: 'png',
  mimeType: 'image/png',
  type: 'image',
  alt: null,
  size: 1000,
  src: '',
  tags: [],
  ...over,
})

describe('utils', () => {
  it('formatSize', () => {
    expect(formatSize(500)).toBe('500 B')
    expect(formatSize(2048)).toBe('2.0 KB')
    expect(formatSize(1572864)).toBe('1.50 MB')
    expect(formatSize(-1)).toBe('')
  })

  it('truncate', () => {
    expect(truncate('hello world', 5)).toBe('hello…')
    expect(truncate('hi', 5)).toBe('hi')
  })

  it('mediaTypeFromMime', () => {
    expect(mediaTypeFromMime('image/png')).toBe('image')
    expect(mediaTypeFromMime('image/svg+xml')).toBe('vector')
    expect(mediaTypeFromMime('video/mp4')).toBe('video')
    expect(mediaTypeFromMime('audio/mpeg')).toBe('audio')
    expect(mediaTypeFromMime('application/pdf')).toBe('pdf')
    expect(mediaTypeFromMime('', 'xlsx')).toBe('spreadsheet')
    expect(mediaTypeFromMime('', 'pptx')).toBe('presentation')
    expect(mediaTypeFromMime('text/plain')).toBe('text')
    expect(mediaTypeFromMime('application/octet-stream', 'bin')).toBe('other')
  })

  it('extensionOf', () => {
    expect(extensionOf('a.b.PNG')).toBe('png')
    expect(extensionOf('noext')).toBe('')
  })

  it('getFileIcon + isImage', () => {
    expect(getFileIcon('image')).toBe('image')
    expect(getFileIcon('zzz')).toBe('file')
    expect(isImage(item({ type: 'image' }))).toBe(true)
    expect(isImage(item({ type: 'vector' }))).toBe(true)
    expect(isImage(item({ type: 'video' }))).toBe(false)
  })
})
