export function resolveDocumentId(doc: any): string {
  return doc.id || doc.page_id
}