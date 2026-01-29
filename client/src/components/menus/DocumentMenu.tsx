/**
 * 文档右键菜单
 */

import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'

interface DocumentMenuProps {
  onRename: () => void
  onDelete: () => void
}

function DocumentMenu({ onRename, onDelete }: DocumentMenuProps) {
  return (
    <Menu as="div" className="relative">
      <MenuButton className="rounded p-1 hover:bg-gray-200">
        <svg
          className="h-4 w-4 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
          />
        </svg>
      </MenuButton>

      <MenuItems
        anchor="bottom end"
        className="z-10 mt-1 w-48 origin-top-right rounded-lg border border-gray-200 bg-white shadow-lg focus:outline-none"
      >
        <div className="p-1">
          <MenuItem>
            {({ focus }) => (
              <button
                onClick={onRename}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm ${
                  focus ? 'bg-primary-50 text-primary-700' : 'text-gray-700'
                }`}
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                重命名
              </button>
            )}
          </MenuItem>

          <MenuItem>
            {({ focus }) => (
              <button
                onClick={onDelete}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm ${
                  focus ? 'bg-red-50 text-red-700' : 'text-red-600'
                }`}
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                删除
              </button>
            )}
          </MenuItem>
        </div>
      </MenuItems>
    </Menu>
  )
}

export default DocumentMenu
