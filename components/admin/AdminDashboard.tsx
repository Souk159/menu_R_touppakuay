'use client'

import { useEffect, useState, useCallback, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import ItemModal from './ItemModal'
import CategoryModal from './CategoryModal'
import BoothsTab from './BoothsTab'
import OrdersTab from './OrdersTab'

interface Category {
  id: number
  name: string
  description: string
  orderNum: number
  _count?: { items: number }
}

interface MenuItem {
  id: number
  categoryId: number
  name: string
  description: string
  price: number
  imageUrl: string
  isAvailable: boolean
  orderNum: number
  category?: { name: string }
}

interface Toast {
  id: number
  message: string
  type: 'success' | 'error'
}

type Tab = 'orders' | 'items' | 'categories' | 'booths' | 'settings'

export default function AdminDashboard() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('orders')
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [filterCat, setFilterCat] = useState<number | ''>('')
  const [toasts, setToasts] = useState<Toast[]>([])
  const [brokenImages, setBrokenImages] = useState<Set<number>>(new Set())

  // Modals
  const [itemModal, setItemModal] = useState<{ open: boolean; item: MenuItem | null }>({ open: false, item: null })
  const [catModal, setCatModal] = useState<{ open: boolean; cat: Category | null }>({ open: false, cat: null })

  // Settings
  const [settings, setSettings] = useState({ name: '', tagline: '', address: '', phone: '' })
  const [settingsSaving, setSettingsSaving] = useState(false)

  function showToast(message: string, type: 'success' | 'error') {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000)
  }

  const loadCategories = useCallback(async () => {
    const res = await fetch('/api/admin/categories')
    if (res.ok) setCategories(await res.json())
  }, [])

  const loadItems = useCallback(async () => {
    const res = await fetch('/api/admin/items')
    if (res.ok) setItems(await res.json())
  }, [])

  const loadSettings = useCallback(async () => {
    const res = await fetch('/api/admin/settings')
    if (res.ok) {
      const data = await res.json()
      setSettings({
        name: data.name || '',
        tagline: data.tagline || '',
        address: data.address || '',
        phone: data.phone || '',
      })
    }
  }, [])

  useEffect(() => {
    Promise.all([loadCategories(), loadItems(), loadSettings()])
  }, [loadCategories, loadItems, loadSettings])

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin')
  }

  async function handleDeleteItem(id: number, name: string) {
    if (!confirm(`ລຶບ "${name}" ອອກ?`)) return
    const res = await fetch(`/api/admin/items/${id}`, { method: 'DELETE' })
    if (res.ok) {
      showToast('ລຶບລາຍການສຳເລັດ', 'success')
      loadItems()
    } else {
      showToast('ລຶບບໍ່ສຳເລັດ', 'error')
    }
  }

  async function handleToggleAvailable(item: MenuItem) {
    const res = await fetch(`/api/admin/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAvailable: !item.isAvailable }),
    })
    if (res.ok) {
      loadItems()
    }
  }

  async function handleDeleteCategory(id: number, name: string) {
    if (!confirm(`ລຶບໝວດ "${name}" ແລະລາຍການທັງໝົດໃນໝວດ?`)) return
    const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' })
    if (res.ok) {
      showToast('ລຶບໝວດສຳເລັດ', 'success')
      loadCategories()
      loadItems()
    } else {
      showToast('ລຶບບໍ່ສຳເລັດ', 'error')
    }
  }

  async function handleSaveSettings(e: FormEvent) {
    e.preventDefault()
    setSettingsSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (res.ok) showToast('ບັນທຶກການຕັ້ງຄ່າສຳເລັດ', 'success')
      else showToast('ບັນທຶກບໍ່ສຳເລັດ', 'error')
    } finally {
      setSettingsSaving(false)
    }
  }

  const filteredItems = filterCat ? items.filter((i) => i.categoryId === filterCat) : items

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'Phetsarath OT, Phetsarath, sans-serif' }}>
      {/* ====== HEADER ====== */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🍽️</span>
            <span className="font-bold text-gray-800 hidden sm:block">ລະບົບຈັດການເມນູ</span>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs md:text-sm text-orange-600 border border-orange-300 px-3 py-1.5 rounded-lg hover:bg-orange-50 transition flex items-center gap-1"
            >
              <span>👁</span>
              <span className="hidden sm:block">ເບິ່ງເມນູ</span>
            </a>
            <button
              onClick={handleLogout}
              className="text-xs md:text-sm text-gray-600 border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition"
            >
              ອອກຈາກລະບົບ
            </button>
          </div>
        </div>
      </header>

      {/* ====== TOP TABS (tablet / desktop only) ====== */}
      <div className="bg-white border-b border-gray-200 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 flex gap-0">
          {([
            { key: 'orders',     label: 'ຄຳສັ່ງ',   icon: '🔔' },
            { key: 'items',      label: 'ລາຍການ',   icon: '🍜' },
            { key: 'categories', label: 'ໝວດ',      icon: '📂' },
            { key: 'booths',     label: 'ຕູບ',       icon: '🏡' },
            { key: 'settings',   label: 'ຕັ້ງຄ່າ',  icon: '⚙️' },
          ] as { key: Tab; label: string; icon: string }[]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-5 py-3.5 text-sm font-semibold border-b-2 transition-all ${
                tab === t.key
                  ? 'border-green-600 text-green-700'
                  : 'border-transparent text-gray-500 hover:text-green-600'
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-24 md:pb-8">
        {/* ====== ORDERS TAB ====== */}
        {tab === 'orders' && <OrdersTab showToast={showToast} />}

        {/* ====== ITEMS TAB ====== */}
        {tab === 'items' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <h1 className="text-xl font-bold text-gray-800">ລາຍການອາຫານ</h1>
              <div className="flex items-center gap-2">
                <select
                  value={filterCat}
                  onChange={(e) => setFilterCat(e.target.value ? parseInt(e.target.value) : '')}
                  className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                >
                  <option value="">ທຸກໝວດ</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button
                  onClick={() => setItemModal({ open: true, item: null })}
                  className="bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-4 py-2 rounded-xl transition flex items-center gap-1.5"
                >
                  <span>+</span> ເພີ່ມລາຍການ
                </button>
              </div>
            </div>

            {filteredItems.length === 0 ? (
              <div className="text-center py-16 text-gray-400 bg-white rounded-2xl">
                <div className="text-5xl mb-3 opacity-30">🍜</div>
                <p>ຍັງບໍ່ມີລາຍການ. ກົດ &quot;ເພີ່ມລາຍການ&quot; ເພື່ອເລີ່ມ</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className={`bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 ${
                      !item.isAvailable ? 'opacity-60' : ''
                    }`}
                  >
                    {/* Image */}
                    <div className="relative aspect-[16/9] bg-gray-50 overflow-hidden">
                      {item.imageUrl && !brokenImages.has(item.id) ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          sizes="(max-width: 640px) 50vw, 33vw"
                          className="object-cover"
                          onError={() => setBrokenImages((prev) => new Set([...prev, item.id]))}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl bg-amber-50 text-gray-400">
                          🍜
                        </div>
                      )}
                      <span
                        className={`absolute top-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full ${
                          item.isAvailable
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {item.isAvailable ? 'ມີ' : 'ໝົດ'}
                      </span>
                    </div>

                    <div className="p-3.5">
                      <p className="text-xs text-orange-500 font-medium mb-0.5">
                        {item.category?.name}
                      </p>
                      <h3 className="font-bold text-gray-800 text-sm mb-0.5 line-clamp-1">
                        {item.name}
                      </h3>
                      <p className="font-bold text-green-700 text-sm mb-3">
                        {new Intl.NumberFormat('lo-LA').format(item.price)} ກີບ
                      </p>

                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleToggleAvailable(item)}
                          className={`flex-1 text-xs font-semibold py-1.5 rounded-lg transition ${
                            item.isAvailable
                              ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {item.isAvailable ? 'ໝາຍໝົດ' : 'ໝາຍມີ'}
                        </button>
                        <button
                          onClick={() => setItemModal({ open: true, item })}
                          className="flex-1 text-xs font-semibold py-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition"
                        >
                          ແກ້ໄຂ
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id, item.name)}
                          className="flex-1 text-xs font-semibold py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition"
                        >
                          ລຶບ
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ====== CATEGORIES TAB ====== */}
        {tab === 'categories' && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <h1 className="text-xl font-bold text-gray-800">ໝວດໝູ່</h1>
              <button
                onClick={() => setCatModal({ open: true, cat: null })}
                className="bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-4 py-2 rounded-xl transition flex items-center gap-1.5"
              >
                <span>+</span> ເພີ່ມໝວດ
              </button>
            </div>

            {categories.length === 0 ? (
              <div className="text-center py-16 text-gray-400 bg-white rounded-2xl">
                <div className="text-5xl mb-3 opacity-30">📂</div>
                <p>ຍັງບໍ່ມີໝວດ. ກົດ &quot;ເພີ່ມໝວດ&quot; ເພື່ອເລີ່ມ</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        ຊື່ໝວດ
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                        ລາຍລະອຽດ
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        ລາຍການ
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        ລຳດັບ
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        ການດຳເນີນການ
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((cat, i) => (
                      <tr
                        key={cat.id}
                        className={`border-b border-gray-50 hover:bg-orange-50/30 transition-colors ${
                          i === categories.length - 1 ? 'border-b-0' : ''
                        }`}
                      >
                        <td className="px-4 py-3.5">
                          <span className="font-semibold text-gray-800">{cat.name}</span>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-500 hidden md:table-cell">
                          {cat.description || <span className="text-gray-300">-</span>}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="text-sm font-medium text-gray-600">
                            {cat._count?.items ?? 0}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center text-sm text-gray-500">
                          {cat.orderNum}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setCatModal({ open: true, cat })}
                              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition"
                            >
                              ແກ້ໄຂ
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(cat.id, cat.name)}
                              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition"
                            >
                              ລຶບ
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ====== BOOTHS TAB ====== */}
        {tab === 'booths' && <BoothsTab showToast={showToast} />}

        {/* ====== SETTINGS TAB ====== */}
        {tab === 'settings' && (
          <div className="max-w-lg">
            <h1 className="text-xl font-bold text-gray-800 mb-5">ຕັ້ງຄ່າຮ້ານ</h1>
            <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  ຊື່ຮ້ານ
                </label>
                <input
                  type="text"
                  value={settings.name}
                  onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="ຮ້ານອາຫານ..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  ຄຳຂວັນ / Tagline
                </label>
                <input
                  type="text"
                  value={settings.tagline}
                  onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="ອາຫານອຣ່ອຍ ສົດໃໝ່ ທຸກວັນ..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  ທີ່ຢູ່
                </label>
                <input
                  type="text"
                  value={settings.address}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="ທີ່ຢູ່ຮ້ານ..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  ເບີໂທ
                </label>
                <input
                  type="tel"
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="020 xxxx xxxx"
                />
              </div>
              <button
                type="submit"
                disabled={settingsSaving}
                className="w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50 text-sm"
              >
                {settingsSaving ? 'ກຳລັງບັນທຶກ...' : 'ບັນທຶກການຕັ້ງຄ່າ'}
              </button>
            </form>
          </div>
        )}
      </main>

      {/* ====== MODALS ====== */}
      {itemModal.open && (
        <ItemModal
          item={itemModal.item}
          categories={categories}
          onClose={() => setItemModal({ open: false, item: null })}
          onSaved={() => { loadItems(); loadCategories() }}
          showToast={showToast}
        />
      )}
      {catModal.open && (
        <CategoryModal
          category={catModal.cat}
          onClose={() => setCatModal({ open: false, cat: null })}
          onSaved={() => { loadCategories(); loadItems() }}
          showToast={showToast}
        />
      )}

      {/* ====== BOTTOM NAV (mobile only) ====== */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 md:hidden safe-area-pb">
        <div className="flex">
          {([
            { key: 'orders',     label: 'ຄຳສັ່ງ',  icon: '🔔' },
            { key: 'items',      label: 'ລາຍການ',  icon: '🍜' },
            { key: 'categories', label: 'ໝວດ',     icon: '📂' },
            { key: 'booths',     label: 'ຕູບ',      icon: '🏡' },
            { key: 'settings',   label: 'ຕັ້ງຄ່າ', icon: '⚙️' },
          ] as { key: Tab; label: string; icon: string }[]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors ${
                tab === t.key ? 'text-green-700' : 'text-gray-400'
              }`}
            >
              <span className="text-xl leading-none">{t.icon}</span>
              <span className="text-[10px] font-semibold">{t.label}</span>
              {tab === t.key && <span className="absolute bottom-0 w-8 h-0.5 bg-green-600 rounded-full" />}
            </button>
          ))}
        </div>
      </nav>

      {/* ====== TOASTS ====== */}
      <div className="fixed bottom-20 md:bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white animate-in slide-in-from-right-5 ${
              toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
            }`}
          >
            <span>{toast.type === 'success' ? '✓' : '✕'}</span>
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  )
}
