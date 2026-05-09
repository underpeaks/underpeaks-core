export type UploadFileType = 'image' | 'video' | 'document' | 'any'

export interface UploadConfig {
  folder?:            string
  allowFolderSelect?: boolean
  fileType?:          UploadFileType
  maxSizeKb:          number
  label?:             string
  hint?:              string
  recommended?:       string
  resize?:            { width: number; height: number; fit: 'inside' | 'cover' }
  mode?:              'local' | 'storage'
 
}

export interface UploadResult {
  url:      string
  name:     string
  size:     number
  folder:   string
  mimeType: string
}