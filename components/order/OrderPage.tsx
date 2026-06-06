'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'

interface MenuItem {
  id: number
  name: string
  description: string
  price: number
  imageUrl: string
}
interface Category { id: number; name: string; description: string; items: MenuItem[] }
interface CartItem { menuItemId: number; name: string; price: number; quantity: number }
interface BoothInfo { id: number; name: string; isOpen: boolean }
interface OrderStatus {
  id: number
  status: string
  rejectReason: string
  totalAmount: number
  note: string
  createdAt?: string
  items: { name: string; price: number; quantity: number }[]
}
interface SubmittedOrder { id: number; status: OrderStatus | null }

type ActiveTab = 'order' | 'history'

function fmt(n: number) { return new Intl.NumberFormat('lo-LA').format(n) + ' ກີບ' }

const TERMINAL = ['served', 'rejected', 'paid', 'cancelled']

const STATUS_CFG: Record<string, { label: string; icon: string; bg: string; text: string }> = {
  pending:   { label: 'ລໍ​ຖ້າ',       icon: '⏳', bg: 'bg-amber-100',  text: 'text-amber-700' },
  confirmed: { label: 'ກຳ​ລັງ​ກຽມ',  icon: '🍳', bg: 'bg-blue-100',   text: 'text-blue-700' },
  served:    { label: 'ເສີບ​ແລ້ວ',   icon: '🍽️', bg: 'bg-green-100',  text: 'text-green-700' },
  rejected:  { label: 'ຖືກ​ປະ​ຕິ​ເສດ', icon: '❌', bg: 'bg-red-100',   text: 'text-red-700' },
  paid:      { label: 'ຈ່າຍ​ແລ້ວ',   icon: '💰', bg: 'bg-gray-100',   text: 'text-gray-600' },
  cancelled: { label: 'ຍົກ​ເລີກ​ແລ້ວ', icon: '🚫', bg: 'bg-gray-100', text: 'text-gray-400' },
}

export default function OrderPage() {
  const { boothId } = useParams() as { boothId: string }
  const [booth, setBooth] = useState<BoothInfo | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [unavailableItems, setUnavailableItems] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<number>(0)
  const [editingQtyId, setEditingQtyId] = useState<number | null>(null)
  const sectionRefs = useRef<Map<number, HTMLElement>>(new Map())

  // Tab & order history
  const [activeTab, setActiveTab] = useState<ActiveTab>('order')
  const [submittedOrders, setSubmittedOrders] = useState<SubmittedOrder[]>([])
  const [cancelling, setCancelling] = useState<number | null>(null)
  const [billRequested, setBillRequested] = useState(false)
  const [requestingBill, setRequestingBill] = useState(false)

  useEffect(() => {
    fetch(`/api/order/${boothId}`)
      .then((r) => r.json())
      .then((d) => {
        setBooth(d.booth)
        setCategories(d.categories || [])
        if (d.categories?.[0]) setActiveId(d.categories[0].id)
      })
      .finally(() => setLoading(false))
  }, [boothId])

  // Load today's existing orders for this booth on mount
  useEffect(() => {
    fetch(`/api/order/${boothId}/history`)
      .then((r) => r.json())
      .then((orders: OrderStatus[]) => {
        if (!Array.isArray(orders)) return
        setSubmittedOrders(orders.map((o) => ({ id: o.id, status: o })))
      })
      .catch(() => {})
  }, [boothId])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) setActiveId(parseInt(e.target.id.replace('oc-', ''))) }),
      { threshold: 0.3, rootMargin: '-56px 0px -55% 0px' }
    )
    sectionRefs.current.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [categories])

  function addItem(item: MenuItem) {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item.id)
      if (existing) return prev.map((c) => c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c)
      return [...prev, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1 }]
    })
    if (unavailableItems.length > 0) setUnavailableItems([])
    if (submitError) setSubmitError(null)
  }

  function removeItem(menuItemId: number) {
    setCart((prev) => {
      const item = prev.find((c) => c.menuItemId === menuItemId)
      if (!item) return prev
      if (item.quantity <= 1) return prev.filter((c) => c.menuItemId !== menuItemId)
      return prev.map((c) => c.menuItemId === menuItemId ? { ...c, quantity: c.quantity - 1 } : c)
    })
  }

  function setItemQty(menuItemId: number, qty: number) {
    const n = Math.max(0, Math.min(99, parseInt(String(qty)) || 0))
    if (n === 0) setCart((prev) => prev.filter((c) => c.menuItemId !== menuItemId))
    else setCart((prev) => prev.map((c) => c.menuItemId === menuItemId ? { ...c, quantity: n } : c))
    setEditingQtyId(null)
  }

  const cartTotal = cart.reduce((s, c) => s + c.price * c.quantity, 0)
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0)

  async function submitOrder() {
    setSubmitting(true)
    setSubmitError(null)
    setUnavailableItems([])
    try {
      const res = await fetch(`/api/order/${boothId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart.map((c) => ({ menuItemId: c.menuItemId, quantity: c.quantity })), note }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.unavailableItemNames?.length) setUnavailableItems(data.unavailableItemNames)
        setSubmitError(data.error || 'ເກີດ​ຂໍ້​ຜິດ​ພາດ')
        return
      }
      setSubmittedOrders((prev) => [
        ...prev,
        { id: data.orderId, status: { id: data.orderId, status: 'pending', rejectReason: '', totalAmount: cartTotal, note, createdAt: new Date().toISOString(), items: cart.map((c) => ({ name: c.name, price: c.price, quantity: c.quantity })) } },
      ])
      setNote('')
      setCart([])
      setCartOpen(false)
      setActiveTab('history')
    } finally {
      setSubmitting(false)
    }
  }

  function removeUnavailableAndRetry() {
    const names = new Set(unavailableItems)
    setCart((prev) => prev.filter((c) => !names.has(c.name)))
    setUnavailableItems([])
    setSubmitError(null)
  }

  // Poll non-terminal orders
  const pollOrders = useCallback(async () => {
    const toCheck = submittedOrders.filter((o) => !TERMINAL.includes(o.status?.status ?? ''))
    if (toCheck.length === 0) return
    const updated = await Promise.all(
      toCheck.map(async (o) => {
        const res = await fetch(`/api/order/track/${o.id}`)
        if (!res.ok) return o
        return { id: o.id, status: await res.json() as OrderStatus }
      })
    )
    setSubmittedOrders((prev) =>
      prev.map((o) => updated.find((u) => u.id === o.id) ?? o)
    )
  }, [submittedOrders])

  useEffect(() => {
    if (submittedOrders.length === 0) return
    const hasActive = submittedOrders.some((o) => !TERMINAL.includes(o.status?.status ?? ''))
    if (!hasActive) return
    pollOrders()
    const iv = setInterval(pollOrders, 4000)
    return () => clearInterval(iv)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submittedOrders.map((o) => o.id).join(','), submittedOrders.map((o) => o.status?.status).join(',')])

  async function cancelOrder(orderId: number) {
    setCancelling(orderId)
    try {
      const res = await fetch(`/api/order/track/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', boothId }),
      })
      if (res.ok) {
        setSubmittedOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? { ...o, status: o.status ? { ...o.status, status: 'cancelled' } : { id: orderId, status: 'cancelled', rejectReason: '', totalAmount: 0, note: '', items: [] } }
              : o
          )
        )
      }
    } finally {
      setCancelling(null)
    }
  }

  async function requestBill() {
    setRequestingBill(true)
    try {
      await fetch(`/api/order/${boothId}/bill-request`, { method: 'POST' })
      setBillRequested(true)
    } finally {
      setRequestingBill(false)
    }
  }

  // Counts for badge
  const activeOrderCount = submittedOrders.filter((o) => !TERMINAL.includes(o.status?.status ?? '')).length
  const sessionTotal = submittedOrders
    .filter((o) => !['cancelled', 'rejected', 'paid'].includes(o.status?.status ?? ''))
    .reduce((s, o) => s + (o.status?.totalAmount ?? 0), 0)
  const hasServed = submittedOrders.some((o) => o.status?.status === 'served')

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #14532D, #166534)' }}>
      <div className="text-white text-center">
        <div className="text-5xl mb-4 animate-bounce">🍌</div>
        <p className="text-lg">ກຳ​ລັງ​ໂຫ​ຼດ...</p>
      </div>
    </div>
  )

  if (!booth) return (
    <div className="min-h-screen flex items-center justify-center bg-green-50">
      <div className="text-center text-gray-500 p-8">
        <div className="text-6xl mb-4">❌</div>
        <p className="text-xl font-bold">ບໍ່ພົບຕູບ</p>
      </div>
    </div>
  )

  const boothOpen = booth.isOpen

  return (
    <div className="min-h-screen bg-green-50 flex flex-col" style={{ fontFamily: 'Phetsarath OT, Phetsarath, sans-serif' }}>
      {/* ── Header ── */}
      <header style={{ background: 'linear-gradient(135deg, #14532D 0%, #15803D 60%, #16a34a 100%)' }} className="text-white px-4 pt-5 pb-4 flex-shrink-0">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-green-300 text-xs font-medium tracking-wide mb-0.5">🌿 ສ/ແກ ເພື່ອ​ສັ່ງ​ອາ​ຫານ</p>
            <h1 className="text-xl font-bold">{booth.name}</h1>
          </div>
          {!boothOpen && (
            <span className="bg-red-500/90 text-white text-xs font-bold px-3 py-1.5 rounded-xl">
              🔒 ຕູບ​ປິດ
            </span>
          )}
        </div>
      </header>

      {/* ── Tab bar ── */}
      <div className="bg-white border-b border-green-100 flex-shrink-0 sticky top-0 z-30 shadow-sm">
        <div className="max-w-2xl mx-auto flex">
          <button
            onClick={() => setActiveTab('order')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'order'
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-gray-400 hover:text-green-600'
            }`}
          >
            <span className="text-base">🍜</span>
            ສັ່ງ​ອາ​ຫານ
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold border-b-2 transition-all relative ${
              activeTab === 'history'
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-gray-400 hover:text-green-600'
            }`}
          >
            <span className="text-base">📋</span>
            ປະ​ຫວັດ​ການ​ສັ່ງ
            {activeOrderCount > 0 && (
              <span className="absolute top-2 right-8 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {activeOrderCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── ORDER TAB ── */}
      {activeTab === 'order' && (
        <>
          {/* Category tabs */}
          {categories.length > 0 && (
            <nav className="sticky top-[49px] z-20 bg-white border-b border-green-100 flex-shrink-0">
              <div className="flex overflow-x-auto scrollbar-hide px-2 max-w-2xl mx-auto">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => sectionRefs.current.get(cat.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className={`flex-shrink-0 px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-all ${
                      activeId === cat.id ? 'text-green-700 border-green-600' : 'text-gray-400 border-transparent hover:text-green-600'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </nav>
          )}

          {/* Closed banner */}
          {!boothOpen && (
            <div className="max-w-2xl mx-auto w-full px-3 pt-3">
              <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center gap-3">
                <span className="text-2xl">🔒</span>
                <div>
                  <p className="font-bold text-red-700 text-sm">ຕູບ​ນີ້​ປິດ​ຢູ່</p>
                  <p className="text-xs text-red-500 mt-0.5">ເບິ່ງ​ເມ​ນູ​ໄດ້ ແຕ່​ສັ່ງ​ບໍ່​ໄດ້ — ກະ​ລຸ​ນາ​ຖາມ​ພ​ນັກ​ງານ</p>
                </div>
              </div>
            </div>
          )}

          {/* Menu items */}
          <main className="max-w-2xl mx-auto w-full px-3 py-4 pb-36 flex-1">
            {categories.map((cat) => (
              <section
                key={cat.id}
                id={`oc-${cat.id}`}
                ref={(el) => { if (el) sectionRefs.current.set(cat.id, el) }}
                className="mb-8 scroll-mt-24"
              >
                <h2 className="text-base font-bold text-green-900 mb-3 flex items-center gap-2">
                  <span className="w-1 h-5 bg-green-600 rounded-full" />
                  {cat.name}
                </h2>
                <div className="space-y-2.5">
                  {cat.items.map((item) => {
                    const inCart = cart.find((c) => c.menuItemId === item.id)
                    return (
                      <div key={item.id} className="bg-white rounded-2xl overflow-hidden flex shadow-sm border border-green-50">
                        {item.imageUrl ? (
                          <div className="w-24 h-24 flex-shrink-0 relative overflow-hidden">
                            <Image src={item.imageUrl} alt={item.name} fill sizes="96px" className="object-cover" />
                          </div>
                        ) : (
                          <div className="w-20 h-20 flex-shrink-0 flex items-center justify-center bg-green-50 text-2xl">🍜</div>
                        )}
                        <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                          <div>
                            <p className="font-bold text-gray-800 text-sm leading-snug">{item.name}</p>
                            {item.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{item.description}</p>}
                            <p className="text-sm font-bold text-amber-700 mt-1">{fmt(item.price)}</p>
                          </div>
                          {boothOpen && (
                            <div className="flex justify-end mt-2">
                              {inCart ? (
                                <div className="flex items-center gap-1.5 bg-green-50 rounded-xl px-1.5 py-1">
                                  <button onClick={() => removeItem(item.id)}
                                    className="w-8 h-8 rounded-lg bg-white shadow-sm text-green-700 font-bold text-lg leading-none flex items-center justify-center active:scale-95">−</button>
                                  {editingQtyId === item.id ? (
                                    <input type="number" min={0} max={99} autoFocus defaultValue={inCart.quantity}
                                      className="w-10 text-center text-sm font-bold text-green-900 bg-white rounded-lg border border-green-300 outline-none py-1"
                                      onBlur={(e) => setItemQty(item.id, parseInt(e.target.value))}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') setItemQty(item.id, parseInt((e.target as HTMLInputElement).value))
                                        if (e.key === 'Escape') setEditingQtyId(null)
                                      }} />
                                  ) : (
                                    <button onClick={() => setEditingQtyId(item.id)}
                                      className="w-9 text-center text-sm font-bold text-green-900 bg-white rounded-lg py-1 border border-transparent hover:border-green-300 transition">
                                      {inCart.quantity}
                                    </button>
                                  )}
                                  <button onClick={() => addItem(item)}
                                    className="w-8 h-8 rounded-lg bg-green-600 text-white font-bold text-lg leading-none flex items-center justify-center active:scale-95">+</button>
                                </div>
                              ) : (
                                <button onClick={() => addItem(item)}
                                  className="w-10 h-10 rounded-xl bg-green-600 text-white font-bold text-2xl leading-none flex items-center justify-center shadow-sm hover:bg-green-700 active:scale-95 transition">+</button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            ))}
          </main>

          {/* Floating cart bar */}
          {boothOpen && cartCount > 0 && !cartOpen && (
            <div className="fixed bottom-4 left-4 right-4 z-40 max-w-2xl mx-auto">
              <button
                onClick={() => setCartOpen(true)}
                className="w-full flex items-center justify-between px-5 py-4 rounded-2xl text-white font-bold shadow-xl text-sm"
                style={{ background: 'linear-gradient(135deg, #14532D, #16a34a)' }}
              >
                <span className="bg-white/20 rounded-lg px-2.5 py-1">{cartCount} ລາຍ​ການ</span>
                <span>ເບິ່ງ​ລາຍ​ການ​ສັ່ງ</span>
                <span>{fmt(cartTotal)}</span>
              </button>
            </div>
          )}

          {/* Cart drawer */}
          {cartOpen && (
            <div className="fixed inset-0 z-50 flex flex-col justify-end">
              <div className="absolute inset-0 bg-black/50" onClick={() => setCartOpen(false)} />
              <div className="relative bg-white rounded-t-3xl max-h-[85vh] flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-green-50">
                  <h2 className="text-lg font-bold text-green-900">ລາຍ​ການ​ສັ່ງ</h2>
                  <button onClick={() => setCartOpen(false)} className="text-gray-400 text-2xl leading-none">×</button>
                </div>
                <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
                  {cart.length === 0 && <p className="text-sm text-gray-400 text-center py-4">ຍັງ​ບໍ່​ໄດ້​ເລືອກ​ລາຍ​ການ</p>}
                  {cart.map((item) => (
                    <div key={item.menuItemId} className="flex items-center gap-3 py-1">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-sm">{item.name}</p>
                        <p className="text-xs text-amber-700 mt-0.5">{fmt(item.price)}</p>
                      </div>
                      <p className="font-bold text-gray-800 text-sm w-20 text-right flex-shrink-0">{fmt(item.price * item.quantity)}</p>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => removeItem(item.menuItemId)} className="w-7 h-7 rounded-lg bg-gray-100 text-gray-600 font-bold flex items-center justify-center active:scale-95">−</button>
                        {editingQtyId === -item.menuItemId ? (
                          <input type="number" min={0} max={99} autoFocus defaultValue={item.quantity}
                            className="w-10 text-center text-sm font-bold bg-white rounded-lg border border-green-400 outline-none py-1"
                            onBlur={(e) => setItemQty(item.menuItemId, parseInt(e.target.value))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') setItemQty(item.menuItemId, parseInt((e.target as HTMLInputElement).value))
                              if (e.key === 'Escape') setEditingQtyId(null)
                            }} />
                        ) : (
                          <button onClick={() => setEditingQtyId(-item.menuItemId)} className="w-8 text-center text-sm font-bold bg-gray-100 rounded-lg py-1 hover:bg-green-100 transition">{item.quantity}</button>
                        )}
                        <button onClick={() => addItem({ id: item.menuItemId, name: item.name, price: item.price, description: '', imageUrl: '' })}
                          className="w-7 h-7 rounded-lg bg-green-600 text-white font-bold flex items-center justify-center active:scale-95">+</button>
                      </div>
                    </div>
                  ))}

                  {/* Out-of-stock error */}
                  {unavailableItems.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                      <p className="text-sm font-bold text-red-700 mb-1">⚠️ ລາຍ​ການ​ຕໍ່​ໄປ​ນີ້​ໝົດ​ແລ້ວ:</p>
                      <ul className="text-sm text-red-600 list-disc list-inside mb-2">
                        {unavailableItems.map((name) => <li key={name}>{name}</li>)}
                      </ul>
                      <button onClick={removeUnavailableAndRetry} className="text-xs font-bold text-red-700 underline">
                        ລຶບ​ລາຍ​ການ​ໝົດ​ອອກ ແລ້ວ​ສັ່ງ​ລາຍ​ການ​ທີ່​ຍັງ​ມີ
                      </button>
                    </div>
                  )}
                  {submitError && unavailableItems.length === 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">⚠️ {submitError}</div>
                  )}

                  <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                    placeholder="ໝາຍ​ເຫດ (ຢ່າ​ໃສ່​ຜັກ...)" />
                </div>
                <div className="px-5 py-4 border-t border-green-50 bg-white">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-gray-600 font-medium text-sm">ລວມ​ທັງ​ໝົດ</span>
                    <span className="text-xl font-bold text-green-800">{fmt(cartTotal)}</span>
                  </div>
                  <button onClick={submitOrder} disabled={submitting || cart.length === 0}
                    className="w-full py-4 rounded-2xl text-white font-bold text-base disabled:opacity-50 transition"
                    style={{ background: 'linear-gradient(135deg, #14532D, #16a34a)' }}>
                    {submitting ? 'ກຳ​ລັງ​ສົ່ງ...' : '🍃 ສົ່ງ​ຄຳ​ສັ່ງ'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── HISTORY TAB ── */}
      {activeTab === 'history' && (
        <div className="flex-1 max-w-2xl mx-auto w-full px-3 py-4 pb-6">
          {submittedOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
              <div className="text-6xl mb-4 opacity-30">📋</div>
              <p className="text-base font-medium">ຍັງ​ບໍ່​ທັນ​ສັ່ງ​ຫຍັງ</p>
              <button
                onClick={() => setActiveTab('order')}
                className="mt-5 px-6 py-2.5 rounded-2xl text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #14532D, #16a34a)' }}
              >
                🍜 ໄປ​ສັ່ງ​ອາ​ຫານ
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {[...submittedOrders].reverse().map((ord) => {
                const st = ord.status?.status ?? 'pending'
                const cfg = STATUS_CFG[st] ?? STATUS_CFG.pending
                const isPending = st === 'pending'
                const isConfirmed = st === 'confirmed'
                const isServed = st === 'served' || st === 'paid'
                const isDone = TERMINAL.includes(st)

                return (
                  <div
                    key={ord.id}
                    className={`bg-white rounded-2xl shadow-sm border overflow-hidden ${
                      isPending ? 'border-amber-300' : isConfirmed ? 'border-blue-200' : 'border-gray-100'
                    }`}
                  >
                    {/* Order header */}
                    <div className={`px-4 py-3 flex items-center justify-between ${
                      isPending ? 'bg-amber-50' : isConfirmed ? 'bg-blue-50' : isServed ? 'bg-green-50' : 'bg-gray-50'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{cfg.icon}</span>
                        <div>
                          <p className="font-bold text-gray-800 text-sm">ຄຳ​ສັ່ງ</p>
                          <p className={`text-xs font-semibold ${cfg.text}`}>{cfg.label}</p>
                        </div>
                      </div>
                      {ord.status?.createdAt && (
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {new Date(ord.status.createdAt).toLocaleTimeString('lo-LA', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      {!isDone && (
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" style={{ color: isPending ? '#d97706' : '#2563eb' }} />
                          <span className={`text-xs font-medium ${cfg.text}`}>
                            {isPending ? 'ລໍ​ຖ້າ​ຢືນ​ຢັນ...' : 'ກຳ​ລັງ​ກຽມ...'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Items list */}
                    {ord.status?.items?.length ? (
                      <div className="px-4 py-3 space-y-1.5">
                        {ord.status.items.map((item, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="text-gray-700">{item.name} <span className="text-gray-400">× {item.quantity}</span></span>
                            <span className="text-gray-500 text-xs">{fmt(item.price * item.quantity)}</span>
                          </div>
                        ))}
                        {ord.status.note && (
                          <p className="text-xs text-gray-400 italic mt-1">📝 {ord.status.note}</p>
                        )}
                      </div>
                    ) : (
                      <div className="px-4 py-3">
                        <p className="text-xs text-gray-400 animate-pulse">ກຳ​ລັງ​ໂຫ​ຼດ​ລາຍ​ລະ​ອຽດ...</p>
                      </div>
                    )}

                    {/* Reject reason / admin modification notice */}
                    {ord.status?.rejectReason && (
                      <div className={`mx-4 mb-3 rounded-xl px-3 py-2 text-xs ${
                        st === 'rejected' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'
                      }`}>
                        ⚠️ {ord.status.rejectReason}
                      </div>
                    )}

                    {/* Total + action */}
                    <div className="px-4 py-3 border-t border-gray-50 flex items-center justify-between">
                      {ord.status?.totalAmount ? (
                        <span className="font-bold text-gray-800 text-sm">{fmt(ord.status.totalAmount)}</span>
                      ) : <span />}

                      {isPending && (
                        <button
                          onClick={() => cancelOrder(ord.id)}
                          disabled={cancelling === ord.id}
                          className="text-xs font-bold px-4 py-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition disabled:opacity-50"
                        >
                          {cancelling === ord.id ? '...' : '🚫 ຍົກ​ເລີກ'}
                        </button>
                      )}

                      {isServed && (
                        <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-xl">
                          🍽️ ອາ​ຫານ​ໄດ້​ຮັບ​ແລ້ວ
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Total summary */}
              {sessionTotal > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-green-100 px-5 py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 font-medium text-sm">ລວມ​ທັງ​ໝົດ</span>
                    <span className="text-xl font-bold text-green-800">{fmt(sessionTotal)}</span>
                  </div>
                </div>
              )}

              {/* Request bill button */}
              {submittedOrders.length > 0 && (
                billRequested ? (
                  <div className="w-full py-4 rounded-2xl text-center font-bold text-sm bg-amber-50 border-2 border-amber-300 text-amber-700">
                    💳 ແຈ້ງ​ເຊັກ​ບິນ​ໄປ​ຫາ​ພ​ນັກ​ງານ​ແລ້ວ — ກະ​ລຸ​ນາ​ລໍ​ຖ້າ...
                  </div>
                ) : (
                  <button
                    onClick={requestBill}
                    disabled={requestingBill || !hasServed}
                    className="w-full py-4 rounded-2xl font-bold text-sm transition disabled:opacity-40"
                    style={hasServed ? { background: 'linear-gradient(135deg, #78350f, #d97706)', color: 'white' } : { background: '#f3f4f6', color: '#9ca3af' }}
                  >
                    {requestingBill ? '...' : hasServed ? '💳 ຂໍ​ເຊັກ​ບິນ' : '💳 ຂໍ​ເຊັກ​ບິນ (ລໍ​ອາ​ຫານ​ມາ​ຮອດ​ກ່ອນ)'}
                  </button>
                )
              )}

              {/* Order more button */}
              <button
                onClick={() => setActiveTab('order')}
                className="w-full py-4 rounded-2xl text-white font-bold text-sm"
                style={{ background: 'linear-gradient(135deg, #14532D, #16a34a)' }}
              >
                + ສັ່ງ​ເພີ່ມ​ອີກ
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
