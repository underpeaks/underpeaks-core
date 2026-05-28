export function resolveDocumentId(doc: any): string {
  return doc.id || doc.menu_id
}