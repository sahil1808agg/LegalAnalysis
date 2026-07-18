#!/usr/bin/env node
'use strict'

/**
 * Generates a minimal but valid PDF test file with enough words to pass
 * the MIN_WORDS = 100 threshold in lib/pdf/extractText.ts.
 *
 * Uses only built-in Node.js modules — no external dependencies required.
 *
 * Run from the contractiq/ directory:
 *   node scripts/generate-test-pdf.js
 */

const fs = require('fs')
const path = require('path')

// ~300-word NDA text — well above the 100-word minimum
const NDA_TEXT = [
  'NON-DISCLOSURE AGREEMENT',
  '',
  'This Non-Disclosure Agreement (this Agreement) is entered into as of the',
  'Effective Date by and between Acme Corporation a Delaware corporation',
  'referred to as the Disclosing Party and Beta Incorporated a California',
  'corporation referred to as the Receiving Party.',
  '',
  'WHEREAS the Disclosing Party possesses certain confidential and proprietary',
  'information relating to its business operations technology and other matters',
  'and WHEREAS the Receiving Party desires to receive certain of said',
  'confidential information for the purpose of evaluating a potential business',
  'relationship between the parties.',
  '',
  'Section 1. Confidential Information. Confidential Information means any',
  'data or information that is proprietary to the Disclosing Party and not',
  'generally known to the public whether in tangible or intangible form',
  'whenever and however disclosed including but not limited to technical data',
  'trade secrets know-how research product plans products services customers',
  'markets software developments inventions processes formulas technology',
  'designs drawings engineering hardware configuration information and',
  'financial information.',
  '',
  'Section 2. Obligations of Receiving Party. The Receiving Party agrees to',
  'hold the Confidential Information in strict confidence and to protect it',
  'with at least the same degree of care it uses to protect its own',
  'confidential information but no less than reasonable care. The Receiving',
  'Party shall not disclose any Confidential Information to any third parties',
  'without the prior written consent of the Disclosing Party and shall use',
  'the Confidential Information solely for evaluating the potential business',
  'relationship described herein.',
  '',
  'Section 3. Exclusions. The obligations of confidentiality shall not apply',
  'to information that is or becomes publicly known through no act or omission',
  'of the Receiving Party or that was rightfully received from a third party',
  'without restriction on disclosure.',
  '',
  'Section 4. Term. This Agreement shall remain in effect for a period of',
  'three years from the Effective Date unless terminated earlier by either',
  'party upon thirty days prior written notice to the other party.',
  '',
  'Section 5. Governing Law. This Agreement shall be governed by and',
  'construed in accordance with the laws of the State of Delaware without',
  'regard to conflict of law provisions.',
  '',
  'IN WITNESS WHEREOF the parties have executed this Agreement as of the',
  'date first written above.',
]

function escapeString(s) {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

// Build the PDF content stream
let contentStream = 'BT\n/F1 10 Tf\n72 720 Td\n'
let first = true
for (const line of NDA_TEXT) {
  const escaped = escapeString(line)
  if (first) {
    contentStream += `(${escaped}) Tj\n`
    first = false
  } else {
    contentStream += `0 -13 Td\n(${escaped}) Tj\n`
  }
}
contentStream += 'ET\n'

// Incremental PDF builder that tracks exact byte offsets
class PDF {
  constructor() {
    this._chunks = []
    this._len = 0
  }

  write(str) {
    const buf = Buffer.from(str, 'latin1')
    this._chunks.push(buf)
    this._len += buf.length
  }

  writeRaw(buf) {
    this._chunks.push(buf)
    this._len += buf.length
  }

  offset() {
    return this._len
  }

  toBuffer() {
    return Buffer.concat(this._chunks)
  }
}

const pdf = new PDF()

// Header
pdf.write('%PDF-1.4\n')
pdf.write('%\xe2\xe3\xcf\xd3\n')  // 4 bytes > 127 to flag binary file

// Object 1: Document catalog
const off1 = pdf.offset()
pdf.write('1 0 obj\n')
pdf.write('<< /Type /Catalog /Pages 2 0 R >>\n')
pdf.write('endobj\n')

// Object 2: Pages tree
const off2 = pdf.offset()
pdf.write('2 0 obj\n')
pdf.write('<< /Type /Pages /Kids [3 0 R] /Count 1 >>\n')
pdf.write('endobj\n')

// Object 3: Page
const off3 = pdf.offset()
pdf.write('3 0 obj\n')
pdf.write('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]\n')
pdf.write('   /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\n')
pdf.write('endobj\n')

// Object 4: Content stream
const streamBuf = Buffer.from(contentStream, 'latin1')
const off4 = pdf.offset()
pdf.write('4 0 obj\n')
pdf.write(`<< /Length ${streamBuf.length} >>\n`)
pdf.write('stream\n')
pdf.writeRaw(streamBuf)
pdf.write('\nendstream\n')
pdf.write('endobj\n')

// Object 5: Font
const off5 = pdf.offset()
pdf.write('5 0 obj\n')
pdf.write('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica\n')
pdf.write('   /Encoding /WinAnsiEncoding >>\n')
pdf.write('endobj\n')

// Cross-reference table (each entry must be exactly 20 bytes)
const xrefOffset = pdf.offset()
pdf.write('xref\n')
pdf.write('0 6\n')
pdf.write('0000000000 65535 f \n')  // 20 bytes: 10+1+5+1+1+1+1 = 20 ✓
for (const off of [off1, off2, off3, off4, off5]) {
  pdf.write(String(off).padStart(10, '0') + ' 00000 n \n')  // 20 bytes ✓
}

// Trailer
pdf.write('trailer\n')
pdf.write('<< /Size 6 /Root 1 0 R >>\n')
pdf.write('startxref\n')
pdf.write(String(xrefOffset) + '\n')
pdf.write('%%EOF\n')

const outPath = path.resolve(__dirname, '..', 'test-nda.pdf')
fs.writeFileSync(outPath, pdf.toBuffer())

const words = NDA_TEXT.join(' ').split(/\s+/).filter(Boolean)
console.log('Created test-nda.pdf')
console.log('  Words:', words.length)
console.log('  Lines:', NDA_TEXT.length)
console.log('  File size:', fs.statSync(outPath).size, 'bytes')
