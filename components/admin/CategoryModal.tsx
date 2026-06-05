'use client'

import { useState, useEffect, FormEvent } from 'react'

interface Category {
  id: number
  name: string
  description: string
  orderNum: number
}

interface Props {
  category: Category | null
  onClose: () => void
  onSaved: () => void
  showToast: (msg: string, type: 'success' | 'error') => void
}

export default function CategoryModal({ category, onClose, onSaved, showToast }: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [orderNum, setOrderNum] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (category) {
      setName(category.name)
      setDescription(category.description)
      setOrderNum(category.orderNum)
    } else {
      setName('')
      setDescription('')
      setOrderNum(0)
    }
  }, [category])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const url = category
        ? `/api/admin/categories/${category.id}`
        : '/api/admin/categories'
      const method = category ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, orderNum }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'ເກີດຂໍ້ຜິດພາດ')
      showToast(category ? 'ແກ້ໄຂໝວດສຳເລັດ' : 'ເພີ່ມໝວດສຳເລັດ', 'success')
      onSaved()
      onClose()
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'ເກີດຂໍ້ຜິດພາດ', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-800">
            {category ? 'ແກ້ໄຂໝວດ' : 'ເພີ່ມໝວດໃໝ່'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              ຊື່ໝວດ <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="ເຊັ່ນ: ອາຫານຈານດ່ຽວ, ເຄື່ອງດື່ມ..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">ລາຍລະອຽດ</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="ລາຍລະອຽດໝວດ (ບໍ່ຈຳເປັນ)"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">ລຳດັບ</label>
            <input
              type="number"
              value={orderNum}
              onChange={(e) => setOrderNum(parseInt(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              min={0}
            />
            <p className="text-xs text-gray-400 mt-1">ຕົວເລກນ້ອຍ = ສະແດງກ່ອນ</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition text-sm"
            >
              ຍົກເລີກ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-50 text-sm"
            >
              {loading ? 'ກຳລັງບັນທຶກ...' : 'ບັນທຶກ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
