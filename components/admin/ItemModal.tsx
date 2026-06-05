'use client'

/* eslint-disable @next/next/no-img-element */
import { useState, useEffect, FormEvent, useRef } from 'react'

interface Category {
  id: number
  name: string
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
}

interface Props {
  item: MenuItem | null
  categories: Category[]
  onClose: () => void
  onSaved: () => void
  showToast: (msg: string, type: 'success' | 'error') => void
}

export default function ItemModal({ item, categories, onClose, onSaved, showToast }: Props) {
  const [categoryId, setCategoryId] = useState<number>(categories[0]?.id ?? 0)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [isAvailable, setIsAvailable] = useState(true)
  const [orderNum, setOrderNum] = useState(0)
  const [imagePreview, setImagePreview] = useState('')
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (item) {
      setCategoryId(item.categoryId)
      setName(item.name)
      setDescription(item.description)
      setPrice(String(item.price))
      setIsAvailable(item.isAvailable)
      setOrderNum(item.orderNum)
      setImagePreview(item.imageUrl)
    } else {
      setCategoryId(categories[0]?.id ?? 0)
      setName('')
      setDescription('')
      setPrice('')
      setIsAvailable(true)
      setOrderNum(0)
      setImagePreview('')
    }
  }, [item, categories])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setImagePreview(url)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!categoryId) {
      showToast('ກະລຸນາເລືອກໝວດ', 'error')
      return
    }
    setLoading(true)

    const formData = new FormData()
    formData.append('categoryId', String(categoryId))
    formData.append('name', name)
    formData.append('description', description)
    formData.append('price', price)
    formData.append('isAvailable', String(isAvailable))
    formData.append('orderNum', String(orderNum))

    const file = fileRef.current?.files?.[0]
    if (file) formData.append('image', file)

    try {
      const url = item ? `/api/admin/items/${item.id}` : '/api/admin/items'
      const method = item ? 'PUT' : 'POST'
      const res = await fetch(url, { method, body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'ເກີດຂໍ້ຜິດພາດ')
      showToast(item ? 'ແກ້ໄຂລາຍການສຳເລັດ' : 'ເພີ່ມລາຍການສຳເລັດ', 'success')
      onSaved()
      onClose()
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'ເກີດຂໍ້ຜິດພາດ', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-800">
            {item ? 'ແກ້ໄຂລາຍການ' : 'ເພີ່ມລາຍການໃໝ່'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Category */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              ໝວດ <span className="text-red-500">*</span>
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
              required
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              ຊື່ລາຍການ <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="ຊື່ອາຫານ..."
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">ລາຍລະອຽດ</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              placeholder="ລາຍລະອຽດ (ບໍ່ຈຳເປັນ)"
            />
          </div>

          {/* Price + Order */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                ລາຄາ (ກີບ) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="25000"
                min={0}
                step={500}
                required
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
            </div>
          </div>

          {/* Image upload */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">ຮູບພາບ</label>
            <div className="flex gap-3 items-start">
              {imagePreview && (
                <div className="w-20 h-20 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0">
                  {/* blob: and /uploads/ URLs — next/image doesn't support blob: */}
                  <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="img-upload"
                />
                <label
                  htmlFor="img-upload"
                  className="inline-flex items-center gap-2 border border-dashed border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-500 cursor-pointer hover:border-orange-400 hover:text-orange-600 transition w-full justify-center"
                >
                  <span>📷</span>
                  <span>{imagePreview ? 'ປ່ຽນຮູບ' : 'ອັບໂຫລດຮູບ'}</span>
                </label>
                <p className="text-xs text-gray-400 mt-1.5">PNG, JPG, WEBP (ສູງສຸດ 5MB)</p>
              </div>
            </div>
          </div>

          {/* Available toggle */}
          <div className="flex items-center justify-between py-2 px-4 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm font-semibold text-gray-700">ສະຖານະ</p>
              <p className="text-xs text-gray-400">{isAvailable ? 'ມີໃຫ້ສັ່ງໄດ້' : 'ໝົດຊົ່ວຄາວ'}</p>
            </div>
            <button
              type="button"
              onClick={() => setIsAvailable(!isAvailable)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                isAvailable ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  isAvailable ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
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
