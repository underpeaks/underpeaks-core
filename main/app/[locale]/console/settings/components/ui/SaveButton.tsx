export function SaveButton({ onClick, saving, saved }: {
  onClick?: () => void;
  saving?: boolean;
  saved?: boolean;
}) {
  return (
    <div className="flex items-center justify-end gap-3 pt-2">
      {saved && (
        <p className="text-xs text-green-600 flex items-center gap-1.5">
          ✓ Saved successfully
        </p>
      )}
      <button
        onClick={onClick}
        disabled={saving}
        className="flex items-center gap-2 px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 disabled:opacity-50 transition"
      >
        {saving && (
          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        )}
        {saving ? 'Saving…' : 'Save Changes'}
      </button>
    </div>
  );
}