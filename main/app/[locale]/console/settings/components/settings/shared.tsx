// // ── Field ─────────────────────────────────────────────────────────────────────
// export function Field({
//   label,
//   hint,
//   children,
// }: {
//   label: string;
//   hint?: string;
//   children: React.ReactNode;
// }) {
//   return (
//     <div className="flex flex-col gap-1">
//       <label className="text-xs font-semibold text-gray-700">{label}</label>
//       {children}
//       {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
//     </div>
//   );
// }

// // ── Input ─────────────────────────────────────────────────────────────────────
// export function Input({
//   placeholder,
//   type = 'text',
//   value,
//   onChange,
// }: {
//   placeholder?: string;
//   type?: string;
//   value?: string;
//   onChange?: (v: string) => void;
// }) {
//   return (
//     <input
//       type={type}
//       placeholder={placeholder}
//       value={value}
//       onChange={(e) => onChange?.(e.target.value)}
//       className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:bg-white transition"
//     />
//   );
// }

// // ── Toggle ────────────────────────────────────────────────────────────────────
// export function Toggle({
//   checked,
//   onChange,
//   label,
// }: {
//   checked: boolean;
//   onChange: (v: boolean) => void;
//   label: string;
// }) {
//   return (
//     <label className="flex items-center gap-3 cursor-pointer select-none">
//       <div
//         onClick={() => onChange(!checked)}
//         className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
//           checked ? 'bg-gray-800' : 'bg-gray-300'
//         }`}
//       >
//         <div
//           className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
//             checked ? 'translate-x-5' : 'translate-x-0'
//           }`}
//         />
//       </div>
//       <span className="text-sm text-gray-700">{label}</span>
//     </label>
//   );
// }

// // ── SectionCard ───────────────────────────────────────────────────────────────
// export function SectionCard({
//   title,
//   children,
// }: {
//   title: string;
//   children: React.ReactNode;
// }) {
//   return (
//     <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
//       <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
//         <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
//       </div>
//       <div className="px-5 py-4 flex flex-col gap-4">{children}</div>
//     </div>
//   );
// }

// // ── SaveButton ────────────────────────────────────────────────────────────────
// export function SaveButton() {
//   return (
//     <div className="flex justify-end pt-2">
//       <button className="px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition">
//         Save Changes
//       </button>
//     </div>
//   );
// }