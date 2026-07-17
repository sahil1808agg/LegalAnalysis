export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB
export const MAX_PAGE_COUNT = 200
export const MAX_MESSAGE_LENGTH = 5000
export const MAX_CHAT_HISTORY = parseInt(process.env.MAX_CHAT_HISTORY ?? '100', 10)

export function validateFileSize(bytes: number): boolean {
  return bytes <= MAX_FILE_SIZE_BYTES
}

export function validatePageCount(pages: number): boolean {
  return pages <= MAX_PAGE_COUNT
}

export function validateMessageLength(message: string): boolean {
  return message.length <= MAX_MESSAGE_LENGTH
}
