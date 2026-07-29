// Regenerate the demo library's sample files.
//
// The examples' media library wants one of every media type, and every card
// should offer a working action — "open in new tab" for the types the picker
// can't render inline. That means the bytes behind them have to be real files.
//
// They are served as static assets from each example's public/samples/ rather
// than built in the browser as blob: URLs, because a blob URL only works for
// MIME types the browser *renders*: navigating a new tab to a blob of a
// download-type (docx, xlsx, pptx, zip) opens an empty tab and downloads
// nothing. A plain HTTP URL behaves like production — rendered or downloaded
// under its real filename.
//
// The Office formats are zips of XML parts; the parts below are the minimum
// Word / Excel / PowerPoint accept, verified on macOS with
// `textutil -convert txt` (docx) and `qlmanage -t` (all three produce real
// thumbnails, so QuickLook parses them as documents rather than rejecting them).
//
// Run from the repo root:  node scripts/make-sample-files.mjs

import { deflateRawSync, crc32 } from 'node:zlib'
import { writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const root = fileURLToPath(new URL('..', import.meta.url))

// ── a minimal zip writer ─────────────────────────────────────────────
// Deflated entries with a fixed timestamp, so the output is byte-for-byte
// reproducible and the committed base64 only changes when the parts do.

const DOS_TIME = 0x9000 // 18:00:00
const DOS_DATE = 0x5c01 // 2026-01-01

const zip = (parts) => {
  const locals = []
  const central = []
  let offset = 0

  for (const [name, body] of Object.entries(parts)) {
    const raw = Buffer.from(body, 'utf8')
    const deflated = deflateRawSync(raw, { level: 9 })
    const nameBuf = Buffer.from(name, 'utf8')
    const sum = crc32(raw)

    const local = Buffer.alloc(30 + nameBuf.length)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4) // version needed
    local.writeUInt16LE(0, 6) // flags
    local.writeUInt16LE(8, 8) // deflate
    local.writeUInt16LE(DOS_TIME, 10)
    local.writeUInt16LE(DOS_DATE, 12)
    local.writeUInt32LE(sum, 14)
    local.writeUInt32LE(deflated.length, 18)
    local.writeUInt32LE(raw.length, 22)
    local.writeUInt16LE(nameBuf.length, 26)
    local.writeUInt16LE(0, 28) // extra length
    nameBuf.copy(local, 30)
    locals.push(local, deflated)

    const entry = Buffer.alloc(46 + nameBuf.length)
    entry.writeUInt32LE(0x02014b50, 0)
    entry.writeUInt16LE(20, 4) // version made by
    entry.writeUInt16LE(20, 6) // version needed
    entry.writeUInt16LE(0, 8) // flags
    entry.writeUInt16LE(8, 10) // deflate
    entry.writeUInt16LE(DOS_TIME, 12)
    entry.writeUInt16LE(DOS_DATE, 14)
    entry.writeUInt32LE(sum, 16)
    entry.writeUInt32LE(deflated.length, 20)
    entry.writeUInt32LE(raw.length, 24)
    entry.writeUInt16LE(nameBuf.length, 28)
    entry.writeUInt16LE(0, 30) // extra
    entry.writeUInt16LE(0, 32) // comment
    entry.writeUInt16LE(0, 34) // disk
    entry.writeUInt16LE(0, 36) // internal attrs
    entry.writeUInt32LE(0, 38) // external attrs
    entry.writeUInt32LE(offset, 42)
    nameBuf.copy(entry, 46)
    central.push(entry)

    offset += local.length + deflated.length
  }

  const dir = Buffer.concat(central)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(0, 4) // this disk
  end.writeUInt16LE(0, 6) // disk with central dir
  end.writeUInt16LE(central.length, 8)
  end.writeUInt16LE(central.length, 10)
  end.writeUInt32LE(dir.length, 12)
  end.writeUInt32LE(offset, 16)
  end.writeUInt16LE(0, 20) // comment length
  return Buffer.concat([...locals, dir, end])
}

// ── the OOXML parts ──────────────────────────────────────────────────

const CT = 'http://schemas.openxmlformats.org/package/2006/content-types'
const REL = 'http://schemas.openxmlformats.org/package/2006/relationships'
const OREL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const DML = 'http://schemas.openxmlformats.org/drawingml/2006/main'
const decl = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'

const rels = (list) =>
  `${decl}<Relationships xmlns="${REL}">${list
    .map((r) => `<Relationship Id="${r.id}" Type="${OREL}/${r.type}" Target="${r.target}"/>`)
    .join('')}</Relationships>`

const defaults =
  `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
  `<Default Extension="xml" ContentType="application/xml"/>`

const DOCX = {
  '[Content_Types].xml':
    `${decl}<Types xmlns="${CT}">${defaults}` +
    `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
    `</Types>`,
  '_rels/.rels': rels([{ id: 'rId1', type: 'officeDocument', target: 'word/document.xml' }]),
  'word/document.xml':
    `${decl}<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>` +
    `<w:p><w:r><w:t>Proposal</w:t></w:r></w:p>` +
    `<w:p><w:r><w:t>A sample document from the @anil-labs/file-picker demo media library.</w:t></w:r></w:p>` +
    `</w:body></w:document>`,
}

const SHEET_ROWS = [
  ['Line item', 'Amount'],
  ['Design', 4200],
  ['Engineering', 18600],
  ['Infrastructure', 2400],
]

const XLSX = {
  '[Content_Types].xml':
    `${decl}<Types xmlns="${CT}">${defaults}` +
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
    `</Types>`,
  '_rels/.rels': rels([{ id: 'rId1', type: 'officeDocument', target: 'xl/workbook.xml' }]),
  'xl/workbook.xml':
    `${decl}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${OREL}">` +
    `<sheets><sheet name="Budget" sheetId="1" r:id="rId1"/></sheets></workbook>`,
  'xl/_rels/workbook.xml.rels': rels([
    { id: 'rId1', type: 'worksheet', target: 'worksheets/sheet1.xml' },
  ]),
  'xl/worksheets/sheet1.xml':
    `${decl}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>` +
    SHEET_ROWS.map(
      (cells, r) =>
        `<row r="${r + 1}">` +
        cells
          .map((value, c) => {
            const ref = `${String.fromCharCode(65 + c)}${r + 1}`
            return typeof value === 'number'
              ? `<c r="${ref}"><v>${value}</v></c>`
              : `<c r="${ref}" t="inlineStr"><is><t>${value}</t></is></c>`
          })
          .join('') +
        `</row>`,
    ).join('') +
    `</sheetData></worksheet>`,
}

const pptShape = (id, name, text, size) =>
  `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${name}"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>` +
  `<p:nvPr><p:ph type="${id === 2 ? 'ctrTitle' : 'subTitle'}" idx="${id === 2 ? 0 : 1}"/></p:nvPr></p:nvSpPr>` +
  `<p:spPr><a:xfrm><a:off x="838200" y="${id === 2 ? 1800000 : 3500000}"/><a:ext cx="7467600" cy="1470025"/></a:xfrm></p:spPr>` +
  `<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US" sz="${size}"/><a:t>${text}</a:t></a:r></a:p></p:txBody></p:sp>`

const PPTX = {
  '[Content_Types].xml':
    `${decl}<Types xmlns="${CT}">${defaults}` +
    `<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>` +
    `<Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>` +
    `<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>` +
    `<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>` +
    `<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>` +
    `</Types>`,
  '_rels/.rels': rels([{ id: 'rId1', type: 'officeDocument', target: 'ppt/presentation.xml' }]),
  'ppt/presentation.xml':
    `${decl}<p:presentation xmlns:a="${DML}" xmlns:r="${OREL}" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">` +
    `<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>` +
    `<p:sldIdLst><p:sldId id="256" r:id="rId2"/></p:sldIdLst>` +
    `<p:sldSz cx="9144000" cy="6858000"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`,
  'ppt/_rels/presentation.xml.rels': rels([
    { id: 'rId1', type: 'slideMaster', target: 'slideMasters/slideMaster1.xml' },
    { id: 'rId2', type: 'slide', target: 'slides/slide1.xml' },
    { id: 'rId3', type: 'theme', target: 'theme/theme1.xml' },
  ]),
  'ppt/slides/slide1.xml':
    `${decl}<p:sld xmlns:a="${DML}" xmlns:r="${OREL}" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">` +
    `<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>` +
    pptShape(2, 'Title', 'Pitch deck', 3600) +
    pptShape(3, 'Subtitle', '@anil-labs/file-picker demo library', 1800) +
    `</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`,
  'ppt/slides/_rels/slide1.xml.rels': rels([
    { id: 'rId1', type: 'slideLayout', target: '../slideLayouts/slideLayout1.xml' },
  ]),
  'ppt/slideLayouts/slideLayout1.xml':
    `${decl}<p:sldLayout xmlns:a="${DML}" xmlns:r="${OREL}" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="title">` +
    `<p:cSld name="Title Slide"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld>` +
    `<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`,
  'ppt/slideLayouts/_rels/slideLayout1.xml.rels': rels([
    { id: 'rId1', type: 'slideMaster', target: '../slideMasters/slideMaster1.xml' },
  ]),
  'ppt/slideMasters/slideMaster1.xml':
    `${decl}<p:sldMaster xmlns:a="${DML}" xmlns:r="${OREL}" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">` +
    `<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld>` +
    `<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>` +
    `<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst></p:sldMaster>`,
  'ppt/slideMasters/_rels/slideMaster1.xml.rels': rels([
    { id: 'rId1', type: 'slideLayout', target: '../slideLayouts/slideLayout1.xml' },
    { id: 'rId2', type: 'theme', target: '../theme/theme1.xml' },
  ]),
  'ppt/theme/theme1.xml': (() => {
    const fill = `<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>`
    const triple = (inner) => inner.repeat(3)
    return (
      `${decl}<a:theme xmlns:a="${DML}" name="file-picker">` +
      `<a:themeElements><a:clrScheme name="file-picker">` +
      `<a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1><a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>` +
      `<a:dk2><a:srgbClr val="0F172A"/></a:dk2><a:lt2><a:srgbClr val="EEF2F7"/></a:lt2>` +
      `<a:accent1><a:srgbClr val="3B82F6"/></a:accent1><a:accent2><a:srgbClr val="2F6FED"/></a:accent2>` +
      `<a:accent3><a:srgbClr val="16A34A"/></a:accent3><a:accent4><a:srgbClr val="EF6C00"/></a:accent4>` +
      `<a:accent5><a:srgbClr val="8E4EC6"/></a:accent5><a:accent6><a:srgbClr val="E5484D"/></a:accent6>` +
      `<a:hlink><a:srgbClr val="3B82F6"/></a:hlink><a:folHlink><a:srgbClr val="8E4EC6"/></a:folHlink>` +
      `</a:clrScheme><a:fontScheme name="file-picker">` +
      `<a:majorFont><a:latin typeface="Helvetica"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont>` +
      `<a:minorFont><a:latin typeface="Helvetica"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont>` +
      `</a:fontScheme><a:fmtScheme name="file-picker">` +
      `<a:fillStyleLst>${triple(fill)}</a:fillStyleLst>` +
      `<a:lnStyleLst>${triple(`<a:ln>${fill}</a:ln>`)}</a:lnStyleLst>` +
      `<a:effectStyleLst>${triple(`<a:effectStyle><a:effectLst/></a:effectStyle>`)}</a:effectStyleLst>` +
      `<a:bgFillStyleLst>${triple(fill)}</a:bgFillStyleLst>` +
      `</a:fmtScheme></a:themeElements></a:theme>`
    )
  })(),
}

// ── the other sample files ───────────────────────────────────────────

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 160" width="240" height="160">
  <rect width="240" height="160" rx="18" fill="#0f172a"/>
  <circle cx="86" cy="80" r="34" fill="#3b82f6"/>
  <path d="M136 106h72M136 80h72M136 54h44" stroke="#94a3b8" stroke-width="9" stroke-linecap="round"/>
</svg>
`

// No xref table: viewers reconstruct it, and it keeps the sample readable.
const PDF = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 320 140]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 74>>stream
BT /F1 16 Tf 26 78 Td (@anil-labs/file-picker sample) Tj ET
endstream
endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
trailer<</Root 1 0 R/Size 6>>
%%EOF
`

const RTF = `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Helvetica;}}
\\f0\\fs28 Statement of work\\par
\\fs22 Prepared for the @anil-labs/file-picker demo media library.\\par}
`

const CSV = `email,plan,signed_up
ada@example.com,team,2026-01-14
grace@example.com,pro,2026-02-02
alan@example.com,free,2026-03-19
`

const MARKDOWN = `# Release notes

- The card checkbox is the selection indicator
- Two cards per row on phones
- "Open in new tab" for every type the dialog cannot render inline
`

const TXT = `User-agent: *
Allow: /
Sitemap: https://example.com/sitemap.xml
`

const JSON_TOKENS = `{
  "--fp-accent": "#3b82f6",
  "--fp-radius": "12px",
  "--fp-card-min": "148px"
}
`

/** The 22 bytes of a valid, empty zip — an archive with no entries. */
const ZIP = Buffer.from([0x50, 0x4b, 0x05, 0x06, ...new Array(18).fill(0)])

/** A short fading tone, so the audio card's preview really plays something. */
const wav = () => {
  const rate = 8000
  const samples = Math.floor(rate * 0.7)
  const buf = Buffer.alloc(44 + samples)
  buf.write('RIFF', 0, 'ascii')
  buf.writeUInt32LE(36 + samples, 4)
  buf.write('WAVEfmt ', 8, 'ascii')
  buf.writeUInt32LE(16, 16) // fmt chunk size
  buf.writeUInt16LE(1, 20) // PCM
  buf.writeUInt16LE(1, 22) // mono
  buf.writeUInt32LE(rate, 24)
  buf.writeUInt32LE(rate, 28) // byte rate = rate × channels × 1 byte
  buf.writeUInt16LE(1, 32) // block align
  buf.writeUInt16LE(8, 34) // bits per sample
  buf.write('data', 36, 'ascii')
  buf.writeUInt32LE(samples, 40)
  for (let i = 0; i < samples; i++) {
    const fade = 1 - i / samples
    buf[44 + i] = 128 + Math.round(96 * fade * Math.sin((2 * Math.PI * 523.25 * i) / rate))
  }
  return buf
}

// ── emit ─────────────────────────────────────────────────────────────

/** filename → bytes. The seeds reference these as `samples/<filename>`. */
const FILES = {
  'brand-mark.svg': SVG,
  'annual-report.pdf': PDF,
  'statement-of-work.rtf': RTF,
  'proposal.docx': zip(DOCX),
  'subscribers.csv': CSV,
  'budget.xlsx': zip(XLSX),
  'pitch-deck.pptx': zip(PPTX),
  'release-notes.md': MARKDOWN,
  'robots.txt': TXT,
  'chime.wav': wav(),
  'design-tokens.json': JSON_TOKENS,
  'assets-archive.zip': ZIP,
}

const EXAMPLES = ['vanilla', 'react', 'vue', 'svelte', 'solid', 'element', 'landing']

for (const app of EXAMPLES) {
  const dir = join(root, 'examples', app, 'public', 'samples')
  await mkdir(dir, { recursive: true })
  for (const [name, body] of Object.entries(FILES)) {
    await writeFile(join(dir, name), typeof body === 'string' ? Buffer.from(body, 'utf8') : body)
  }
}

const sizes = Object.entries(FILES)
  .map(
    ([name, body]) =>
      `${name} ${typeof body === 'string' ? Buffer.byteLength(body) : body.length}B`,
  )
  .join(', ')
console.log(`wrote ${Object.keys(FILES).length} sample files to ${EXAMPLES.length} example apps`)
console.log(sizes)
