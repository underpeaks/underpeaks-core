export function Input({
  placeholder,
  type = 'text',
  value,
  onChange,
}: {
  placeholder?: string;
  type?: string;
  value?: string;
  onChange?: (v: string) => void;
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:bg-white transition"
    />
  );
}