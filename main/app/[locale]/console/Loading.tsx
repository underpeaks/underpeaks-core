// components/Loader.tsx
import BarLoader from 'react-spinners/BarLoader'
import HashLoader from 'react-spinners/HashLoader'

export default function Loader({ fullScreen = false }: { fullScreen?: boolean }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 bg-gray-100 ${
        fullScreen
          ? 'fixed inset-0 z-[9999] min-h-screen w-full'
          : 'absolute inset-0 z-50'
      }`}
    >
      <HashLoader color="#111827" speedMultiplier={0.8} />
      <p className="text-xs text-gray-400 tracking-wide">Loading…</p>
    </div>
  )
}