export type MediaItem = {
  id:          string
  name:        string
  url:         string
  size:        string
  mimeType:    string
  folder:      string
  folderPath:  string
  uploaded:    string
  project_id?: string   // ← added, optional so existing code doesn't break
  dimensions?: string  
}

// Keep ImageItem as alias for backwards compat
export type ImageItem = MediaItem

export type Folder = {
  id:    string
  name:  string
  count: number
}