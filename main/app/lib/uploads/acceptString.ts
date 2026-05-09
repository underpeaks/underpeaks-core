import { UploadFileType } from './types'

export function getAcceptString(fileType?: UploadFileType): string {
  switch (fileType) {
    case 'image':    return 'image/*'
    case 'video':    return 'video/*'
    case 'document': return '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv'
    case 'any':
    default:         return '*/*'
  }
}