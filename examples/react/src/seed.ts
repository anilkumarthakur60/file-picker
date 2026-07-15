import { createMemoryAdapter } from '@anil-labs/file-picker-core'
import type { FilePickerAdapter, MediaItem } from '@anil-labs/file-picker-core'

const pic = (id: number): string => `https://picsum.photos/id/${id}/600/400`

const img = (
  id: number,
  filename: string,
  folderId: number | null,
  tags: string[] = [],
): MediaItem => ({
  id,
  folderId,
  filename,
  extension: 'jpg',
  mimeType: 'image/jpeg',
  type: 'image',
  alt: filename.replace(/\.\w+$/, ''),
  size: 800_000 + id * 1200,
  src: pic(id),
  tags,
})

const file = (
  id: number,
  filename: string,
  type: MediaItem['type'],
  extension: string,
  mimeType: string,
  folderId: number | null,
  size: number,
  tags: string[] = [],
): MediaItem => ({
  id,
  folderId,
  filename,
  extension,
  mimeType,
  type,
  alt: null,
  size,
  src: '',
  tags,
})

/** A seeded in-memory adapter — the same sample library used by every demo. */
export function createDemoAdapter(): FilePickerAdapter {
  const media: MediaItem[] = [
    img(10, 'sunrise.jpg', 1, ['nature', 'warm']),
    img(20, 'mountains.jpg', 1, ['nature']),
    img(30, 'city-lights.jpg', 1, ['urban']),
    img(40, 'forest.jpg', 1, ['nature', 'green']),
    img(48, 'portrait.jpg', 1, ['people']),
    img(56, 'flowers.jpg', 1, ['nature']),
    img(64, 'desert.jpg', null, ['warm']),
    img(72, 'ocean.jpg', null, ['nature', 'blue']),
    img(80, 'street.jpg', null, ['urban']),
    img(88, 'logo-primary.jpg', 2, ['brand']),
    img(96, 'logo-dark.jpg', 2, ['brand']),
    img(104, 'pattern.jpg', 2, ['brand']),
    file(200, 'annual-report.pdf', 'pdf', 'pdf', 'application/pdf', 3, 2_400_000, [
      'q4',
      'finance',
    ]),
    file(
      201,
      'proposal.docx',
      'document',
      'docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      3,
      480_000,
    ),
    file(202, 'budget.xlsx', 'spreadsheet', 'xlsx', 'application/vnd.ms-excel', 3, 120_000, [
      'finance',
    ]),
    file(203, 'promo.mp4', 'video', 'mp4', 'video/mp4', null, 8_400_000, ['marketing']),
    file(204, 'jingle.mp3', 'audio', 'mp3', 'audio/mpeg', null, 3_200_000),
    file(
      205,
      'pitch-deck.pptx',
      'presentation',
      'pptx',
      'application/vnd.ms-powerpoint',
      2,
      5_400_000,
      ['deck'],
    ),
  ]
  const folders = [
    { id: 1, name: 'Photography' },
    { id: 2, name: 'Branding' },
    { id: 3, name: 'Documents' },
  ]
  return createMemoryAdapter({ media, folders, latency: 350 })
}
