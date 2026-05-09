'use client'

import { SectionCard, Input, FormField } from '../../../ui'

interface Props {
  keyName:    string
  generating: boolean
  onChange:   (v: string) => void
  onGenerate: () => void
}

export default function GenerateKeyForm({ keyName, generating, onChange, onGenerate }: Props) {
  return (
    <SectionCard title="Generate New Key">
      <FormField
        label="Key Name"
        hint="Give it a descriptive name so you remember what it's used for."
      >
        <Input
          placeholder="e.g. Flutter App — Production"
          value={keyName}
          onChange={onChange}
        />
      </FormField>

   

      <div className="flex justify-end">
        <button
          onClick={onGenerate}
          disabled={generating || !keyName.trim()}
          className="flex items-center gap-2 px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {generating && (
            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          )}
          {generating ? 'Generating…' : 'Generate Key'}
        </button>
      </div>
    </SectionCard>
  )
}