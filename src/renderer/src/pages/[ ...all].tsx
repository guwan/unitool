// src/renderer/src/pages/[...all].tsx
export default function NotFound() {
  return (
    <div className="text-center p-20 bg-red-50 rounded-lg">
      <h2 className="text-4xl font-bold text-red-700">404</h2>
      <p className="text-red-500">页面未找到</p>
    </div>
  )
}
