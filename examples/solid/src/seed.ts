import { createMemoryAdapter } from '@anil-labs/file-picker-core'
import type { FilePickerAdapter, MediaItem } from '@anil-labs/file-picker-core'

const pic = (id: number): string => `https://picsum.photos/id/${id}/600/400`

const sample = (filename: string): string => `samples/${filename}`

const OOXML = 'application/vnd.openxmlformats-officedocument'

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
  mimeType: string,
  folderId: number | null,
  size: number,
  tags: string[] = [],
): MediaItem => ({
  id,
  folderId,
  filename,
  extension: filename.split('.').pop() ?? '',
  mimeType,
  type,
  alt: null,
  size,
  src: sample(filename),
  tags,
})

/**
 * A seeded in-memory adapter — the same sample library used by every demo. It
 * covers every `MediaType` the picker knows about, so each icon, accent colour,
 * type filter and card action shows up somewhere in the grid.
 */
export function createDemoAdapter(): FilePickerAdapter {
  const media: MediaItem[] = [
    // image — thumbnails come straight from `src`
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

    // vector — an SVG counts as an image: real thumbnail, lightbox preview
    file(200, 'brand-mark.svg', 'vector', 'image/svg+xml', 2, 306, ['brand', 'logo']),

    // pdf, documents, spreadsheets, presentations, text and unknown types all
    // get the "open in new tab" action instead of a preview
    file(210, 'annual-report.pdf', 'pdf', 'application/pdf', 3, 413, ['q4', 'finance']),
    file(220, 'statement-of-work.rtf', 'document', 'application/rtf', 3, 146, ['legal']),
    file(221, 'proposal.docx', 'document', `${OOXML}.wordprocessingml.document`, 3, 962, ['legal']),
    file(230, 'subscribers.csv', 'spreadsheet', 'text/csv', 3, 119, ['crm']),
    file(231, 'budget.xlsx', 'spreadsheet', `${OOXML}.spreadsheetml.sheet`, 3, 1_656, ['finance']),
    file(240, 'pitch-deck.pptx', 'presentation', `${OOXML}.presentationml.presentation`, 2, 4_515, [
      'deck',
    ]),
    file(250, 'release-notes.md', 'text', 'text/markdown', 3, 161, ['changelog']),
    file(251, 'robots.txt', 'text', 'text/plain', null, 64),
    file(280, 'design-tokens.json', 'other', 'application/json', 2, 84, ['brand']),
    file(281, 'assets-archive.zip', 'other', 'application/zip', null, 22),

    // audio plays inline in the preview overlay; so does video, from a remote
    // sample (the demo ships no video of its own)
    file(270, 'chime.wav', 'audio', 'audio/wav', 4, 5_644, ['ui']),
    {
      ...file(260, 'promo.mp4', 'video', 'video/mp4', 4, 8_400_000, ['marketing']),
      src: 'https://www.w3.org/2010/05/sintel/trailer.mp4',
    },
  ]
  const folders = [
    { id: 1, name: 'Photography' },
    { id: 2, name: 'Branding' },
    { id: 3, name: 'Documents' },
    { id: 4, name: 'Audio & video' },
  ]
  return createMemoryAdapter({ media, folders, latency: 350 })
}
