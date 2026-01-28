import React from 'react'

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen flex-col items-center justify-center">
        <h1 className="text-4xl font-bold text-gray-900">
          企业级协同编辑器
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          项目脚手架搭建完成 ✓
        </p>
        <div className="mt-8 flex gap-4">
          <div className="rounded-lg bg-white px-6 py-4 shadow-md">
            <h3 className="font-semibold text-gray-900">前端技术栈</h3>
            <ul className="mt-2 space-y-1 text-sm text-gray-600">
              <li>✓ React 18 + TypeScript</li>
              <li>✓ Vite</li>
              <li>✓ Tailwind CSS</li>
            </ul>
          </div>
          <div className="rounded-lg bg-white px-6 py-4 shadow-md">
            <h3 className="font-semibold text-gray-900">后端技术栈</h3>
            <ul className="mt-2 space-y-1 text-sm text-gray-600">
              <li>✓ Node.js + TypeScript</li>
              <li>✓ Koa2</li>
              <li>✓ SQLite</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
