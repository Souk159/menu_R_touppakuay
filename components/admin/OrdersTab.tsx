'use client'

import { useEffect, useState, useCallback, FormEvent } from 'react'

interface OrderItem { id: number; itemName: string; itemPrice: number; quantity: number }
interface Order {
  id: number
  boothId: number
  status: string
  totalAmount: number
  note: string
  rejectReason: string
  createdAt: string
  items: OrderItem[]
  booth: { name: string }
}

interface Props {
  showToast: (msg: string, type: 'success' | 'error') => void
}

const STATUS_CONFIG: Record<string, { label: string; icon: string; card: string; badge: string }> = {
  pending:   { label: 'ລໍ​ຖ້າ',      icon: '⏳', card: 'border-amber-300 bg-amber-50',    badge: 'bg-amber-100 text-amber-800' },
  confirmed: { label: 'ຢືນ​ຢັນ',     icon: '🍳', card: 'border-blue-300 bg-blue-50',      badge: 'bg-blue-100 text-blue-800' },
  served:    { label: 'ເສີບ​ແລ້ວ',   icon: '🍽️', card: 'border-green-300 bg-green-50',    badge: 'bg-green-100 text-green-800' },
  rejected:  { label: 'ປະ​ຕິ​ເສດ',  icon: '❌', card: 'border-red-200 bg-red-50',        badge: 'bg-red-100 text-red-700' },
  paid:      { label: 'ຮັບ​ເງິນ',   icon: '💰', card: 'border-gray-200 bg-gray-50',      badge: 'bg-gray-100 text-gray-600' },
  cancelled: { label: 'ຍົກ​ເລີກ',   icon: '🚫', card: 'border-gray-200 bg-gray-50',      badge: 'bg-gray-100 text-gray-500' },
}

function fmt(n: number) { return new Intl.NumberFormat('lo-LA').format(n) }

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return `${diff} ວິ​ກ່ອນ`
  if (diff < 3600) return `${Math.floor(diff / 60)} ນາທີ​ກ່ອນ`
  return `${Math.floor(diff / 3600)} ຊ.ຮ ​ກ່ອນ`
}

export default function OrdersTab({ showToast }: Props) {
  const [allOrders, setAllOrders] = useState<Order[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('pending')
  const [boothFilter, setBoothFilter] = useState<string>('')
  const [booths, setBooths] = useState<{ id: number; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [processing, setProcessing] = useState<number | null>(null)
  const [removingItem, setRemovingItem] = useState<number | null>(null)
  const [rejectModal, setRejectModal] = useState<Order | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [viewMode, setViewMode] = useState<'status' | 'table'>('status')

  const loadOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const params = new URLSearchParams()
      if (boothFilter) params.set('boothId', boothFilter)
      const res = await fetch(`/api/admin/orders?${params}`)
      if (res.ok) {
        setAllOrders(await res.json())
        setLastUpdate(new Date())
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }, [boothFilter])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  useEffect(() => {
    fetch('/api/admin/booths').then((r) => r.json()).then(setBooths).catch(() => {})
  }, [])

  // Auto-refresh every 15s
  useEffect(() => {
    const iv = setInterval(() => loadOrders(true), 15000)
    return () => clearInterval(iv)
  }, [loadOrders])

  // Previous pending count for new-order notification
  const [prevPendingCount, setPrevPendingCount] = useState(0)
  useEffect(() => {
    const pending = allOrders.filter((o) => o.status === 'pending').length
    if (pending > prevPendingCount && prevPendingCount > 0) {
      showToast(`🔔 ມີ​ຄຳ​ສັ່ງ​ໃໝ່ ${pending - prevPendingCount} ລາຍ​ການ!`, 'success')
    }
    setPrevPendingCount(pending)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allOrders])

  const counts = {
    all: allOrders.length,
    pending: allOrders.filter((o) => o.status === 'pending').length,
    confirmed: allOrders.filter((o) => o.status === 'confirmed').length,
    served: allOrders.filter((o) => o.status === 'served').length,
    rejected: allOrders.filter((o) => o.status === 'rejected').length,
    paid: allOrders.filter((o) => o.status === 'paid').length,
    cancelled: allOrders.filter((o) => o.status === 'cancelled').length,
  }

  // Group active orders by booth for table view
  const activeOrders = allOrders.filter((o) => ['pending', 'confirmed', 'served'].includes(o.status))
  const ordersByBooth = booths.map((b) => ({
    booth: b,
    orders: activeOrders.filter((o) => o.boothId === b.id),
    total: activeOrders.filter((o) => o.boothId === b.id).reduce((s, o) => s + o.totalAmount, 0),
  })).filter((g) => g.orders.length > 0)

  const displayed = statusFilter === 'all'
    ? allOrders
    : allOrders.filter((o) => o.status === statusFilter)

  async function confirm(order: Order) {
    setProcessing(order.id)
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed' }),
      })
      if (!res.ok) throw new Error()
      showToast(`ຢືນ​ຢັນ​ຄຳ​ສັ່ງ #${order.id} ສຳ​ເລັດ`, 'success')
      loadOrders(true)
    } catch {
      showToast('ເກີດ​ຂໍ້​ຜິດ​ພາດ', 'error')
    } finally {
      setProcessing(null)
    }
  }

  async function markServed(order: Order) {
    setProcessing(order.id)
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'served' }),
      })
      if (!res.ok) throw new Error()
      showToast(`🍽️ ເສີບ​ຄຳ​ສັ່ງ #${order.id} ສຳ​ເລັດ`, 'success')
      loadOrders(true)
    } catch {
      showToast('ເກີດ​ຂໍ້​ຜິດ​ພາດ', 'error')
    } finally {
      setProcessing(null)
    }
  }

  async function submitReject(e: FormEvent) {
    e.preventDefault()
    if (!rejectModal) return
    setProcessing(rejectModal.id)
    try {
      const res = await fetch(`/api/admin/orders/${rejectModal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected', rejectReason }),
      })
      if (!res.ok) throw new Error()
      showToast(`ປະ​ຕິ​ເສດ​ຄຳ​ສັ່ງ #${rejectModal.id}`, 'success')
      setRejectModal(null)
      setRejectReason('')
      loadOrders(true)
    } catch {
      showToast('ເກີດ​ຂໍ້​ຜິດ​ພາດ', 'error')
    } finally {
      setProcessing(null)
    }
  }

  async function removeOrderItem(orderId: number, orderItemId: number, itemName: string) {
    setRemovingItem(orderItemId)
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'removeItem', orderItemId }),
      })
      if (!res.ok) throw new Error()
      showToast(`ລຶບ "${itemName}" ອອກຈາກ #${orderId} ແລ້ວ`, 'success')
      loadOrders(true)
    } catch {
      showToast('ເກີດ​ຂໍ້​ຜິດ​ພາດ', 'error')
    } finally {
      setRemovingItem(null)
    }
  }

  const TABS = [
    { key: 'pending',   icon: '⏳', label: 'ລໍ​ຖ້າ',      count: counts.pending },
    { key: 'confirmed', icon: '🍳', label: 'ກຽມ',         count: counts.confirmed },
    { key: 'served',    icon: '🍽️', label: 'ເສີບ',        count: counts.served },
    { key: 'rejected',  icon: '❌', label: 'ປະ​ຕິ​ເສດ',   count: counts.rejected },
    { key: 'paid',      icon: '💰', label: 'ຮັບ​ເງິນ',    count: counts.paid },
    { key: 'all',       icon: '📋', label: 'ທຸກ',          count: counts.all },
  ]

  return (
    <div>
      {/* ── Header row ── */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-lg font-bold text-gray-800">ຈັດ​ການ​ຄຳ​ສັ່ງ</h1>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {lastUpdate.toLocaleTimeString('lo-LA')} · ໂຫ​ຼດ​ໃໝ່​ທຸກ 15 ວິ
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {/* View toggle */}
          <div className="flex rounded-xl border border-gray-300 overflow-hidden text-sm">
            <button
              onClick={() => setViewMode('status')}
              className={`px-3 py-2 font-semibold transition flex items-center gap-1 ${viewMode === 'status' ? 'bg-green-700 text-white' : 'bg-white text-gray-600'}`}
            >
              <span>📋</span><span className="hidden sm:inline"> ສະ​ຖາ​ນະ</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-2 font-semibold transition border-l border-gray-300 flex items-center gap-1 ${viewMode === 'table' ? 'bg-green-700 text-white' : 'bg-white text-gray-600'}`}
            >
              <span>🪑</span><span className="hidden sm:inline"> ໂຕະ</span>
            </button>
          </div>
          {/* Reload */}
          <button
            onClick={() => loadOrders()}
            className="border border-gray-300 text-gray-600 text-sm px-2.5 py-2 rounded-xl hover:bg-gray-50 transition"
            title="ໂຫ​ຼດ​ໃໝ່"
          >
            🔄
          </button>
        </div>
      </div>

      {/* ── Booth filter (status mode only) ── */}
      {viewMode === 'status' && booths.length > 0 && (
        <div className="mb-3">
          <select
            value={boothFilter}
            onChange={(e) => setBoothFilter(e.target.value)}
            className="w-full sm:w-auto border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">🪑 ທຸກ​ຕູບ</option>
            {booths.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      )}

      {/* ── Status filter tabs ── */}
      {viewMode === 'status' && (
        <div className="flex gap-1.5 mb-4 overflow-x-auto scrollbar-hide pb-1">
          {TABS.map((tab) => {
            const isActive = statusFilter === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                  isActive ? 'bg-green-700 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                <span>{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
                  isActive ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>
      )}


      {/* Banners */}
      {counts.pending > 0 && statusFilter !== 'pending' && (
        <button
          onClick={() => { setViewMode('status'); setStatusFilter('pending') }}
          className="w-full mb-2 py-2.5 rounded-xl text-sm font-semibold text-white animate-pulse"
          style={{ background: 'linear-gradient(135deg, #b45309, #d97706)' }}
        >
          🔔 ມີ {counts.pending} ຄຳ​ສັ່ງ​ລໍ​ຖ້າ​ຢືນ​ຢັນ
        </button>
      )}
      {counts.confirmed > 0 && statusFilter !== 'confirmed' && (
        <button
          onClick={() => { setViewMode('status'); setStatusFilter('confirmed') }}
          className="w-full mb-2 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}
        >
          🍳 ມີ {counts.confirmed} ລາຍ​ການ​ກຳ​ລັງ​ກຽມ — ກົດ​ເສີບ​ຕອນ​ອາ​ຫານ​ພ້ອມ
        </button>
      )}

      {/* ====== TABLE VIEW ====== */}
      {viewMode === 'table' && (
        loading ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-3 animate-bounce">🍃</div>
            <p>ກຳ​ລັງ​ໂຫ​ຼດ...</p>
          </div>
        ) : ordersByBooth.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl text-gray-400">
            <div className="text-5xl mb-3 opacity-30">🪑</div>
            <p>ບໍ່​ມີ​ໂຕະ​ທີ່​ມີ​ຄຳ​ສັ່ງ​ໃນ​ຂະ​ນີ້</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {ordersByBooth.map(({ booth: b, orders: bOrders, total }) => (
              <div key={b.id} className="bg-white rounded-2xl border-2 border-green-200 shadow-sm overflow-hidden">
                {/* Booth header */}
                <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #14532D, #16a34a)' }}>
                  <div className="text-white">
                    <p className="font-bold text-base">🪑 {b.name}</p>
                    <p className="text-green-200 text-xs mt-0.5">{bOrders.length} ຄຳ​ສັ່ງ · ລວມ {fmt(total)} ກີບ</p>
                  </div>
                  <div className="flex gap-1">
                    {bOrders.some((o) => o.status === 'pending') && (
                      <span className="text-xs bg-amber-400 text-amber-900 font-bold px-2 py-0.5 rounded-full">⏳</span>
                    )}
                    {bOrders.some((o) => o.status === 'confirmed') && (
                      <span className="text-xs bg-blue-400 text-white font-bold px-2 py-0.5 rounded-full">🍳</span>
                    )}
                    {bOrders.some((o) => o.status === 'served') && (
                      <span className="text-xs bg-green-300 text-green-900 font-bold px-2 py-0.5 rounded-full">🍽️</span>
                    )}
                  </div>
                </div>
                {/* Orders in this booth */}
                <div className="divide-y divide-gray-100">
                  {bOrders.map((order) => {
                    const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending
                    const isPending = order.status === 'pending'
                    const isConfirmed = order.status === 'confirmed'
                    const isProcessing = processing === order.id
                    return (
                      <div key={order.id} className="px-4 py-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-400">#{order.id} · {timeAgo(order.createdAt)}</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                            {cfg.icon} {cfg.label}
                          </span>
                        </div>
                        <div className="space-y-0.5 mb-2">
                          {order.items.map((item) => (
                            <div key={item.id} className="flex items-center gap-2 text-sm">
                              <span className="text-gray-700 flex-1 min-w-0">{item.itemName} <span className="text-gray-400">× {item.quantity}</span></span>
                              <span className="text-gray-500 text-xs flex-shrink-0">{fmt(item.itemPrice * item.quantity)} ກີບ</span>
                              {isPending && (
                                <button
                                  onClick={() => removeOrderItem(order.id, item.id, item.itemName)}
                                  disabled={removingItem === item.id}
                                  title="ລຶບ​ລາຍ​ການ​ນີ້"
                                  className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 hover:bg-red-500 text-red-500 hover:text-white text-xs font-bold flex items-center justify-center transition disabled:opacity-40"
                                >
                                  {removingItem === item.id ? '·' : '×'}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        {order.note && (
                          <p className="text-xs text-gray-500 italic mb-2">📝 {order.note}</p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-700">{fmt(order.totalAmount)} ກີບ</span>
                          <div className="flex gap-1.5">
                            {isPending && (
                              <>
                                <button
                                  onClick={() => confirm(order)}
                                  disabled={isProcessing}
                                  className="text-xs font-bold px-3 py-1.5 rounded-lg text-white disabled:opacity-50"
                                  style={{ background: 'linear-gradient(135deg, #14532D, #16a34a)' }}
                                >
                                  {isProcessing ? '...' : '✓ ຢືນ​ຢັນ'}
                                </button>
                                <button
                                  onClick={() => { setRejectModal(order); setRejectReason('') }}
                                  disabled={isProcessing}
                                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-600 text-white disabled:opacity-50"
                                >
                                  ✕
                                </button>
                              </>
                            )}
                            {isConfirmed && (
                              <button
                                onClick={() => markServed(order)}
                                disabled={isProcessing}
                                className="text-xs font-bold px-3 py-1.5 rounded-lg text-white disabled:opacity-50"
                                style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}
                              >
                                {isProcessing ? '...' : '🍽️ ເສີບ'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ====== STATUS VIEW ====== */}
      {viewMode === 'status' && (<>
      {/* Orders list */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-3 animate-bounce">🍃</div>
          <p>ກຳ​ລັງ​ໂຫ​ຼດ...</p>
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl text-gray-400">
          <div className="text-5xl mb-3 opacity-30">📭</div>
          <p>ບໍ່​ມີ​ຄຳ​ສັ່ງ {statusFilter !== 'all' ? STATUS_CONFIG[statusFilter]?.label : ''}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayed.map((order) => {
            const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending
            const isPending = order.status === 'pending'
            const isConfirmed = order.status === 'confirmed'
            const isProcessing = processing === order.id

            return (
              <div
                key={order.id}
                className={`rounded-2xl border-2 overflow-hidden shadow-sm transition-all ${cfg.card} ${
                  isPending ? 'shadow-amber-200 ring-1 ring-amber-300' : ''
                } ${isConfirmed ? 'shadow-blue-100 ring-1 ring-blue-200' : ''}`}
              >
                {/* Card header */}
                <div className="px-4 py-3 flex items-center justify-between border-b border-black/5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-800 text-sm">{order.booth.name}</span>
                    <span className="text-gray-400 text-xs">#{order.id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{timeAgo(order.createdAt)}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                      {cfg.icon} {cfg.label}
                    </span>
                  </div>
                </div>

                {/* Items */}
                <div className="px-4 py-3 space-y-1.5">
                  {isPending && (
                    <p className="text-xs text-gray-400 mb-1">ກົດ × ໜ້າ​ລາຍ​ການ​ໃດ​ເພື່ອ​ລຶບ​ອອກ</p>
                  )}
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm gap-2">
                      <span className="text-gray-700 flex-1 min-w-0">
                        <span className="font-medium">{item.itemName}</span>
                        <span className="text-gray-400 ml-1">× {item.quantity}</span>
                      </span>
                      <span className="text-gray-600 text-xs flex-shrink-0">{fmt(item.itemPrice * item.quantity)} ກີບ</span>
                      {isPending && (
                        <button
                          onClick={() => removeOrderItem(order.id, item.id, item.itemName)}
                          disabled={removingItem === item.id}
                          title="ລຶບ​ລາຍ​ການ​ນີ້​ອອກ"
                          className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 hover:bg-red-500 text-red-500 hover:text-white text-xs font-bold flex items-center justify-center transition disabled:opacity-40"
                        >
                          {removingItem === item.id ? '·' : '×'}
                        </button>
                      )}
                    </div>
                  ))}

                  {order.note && (
                    <div className="flex items-start gap-1.5 mt-2 bg-white/60 rounded-lg px-2.5 py-1.5">
                      <span className="text-xs">📝</span>
                      <span className="text-xs text-gray-600 italic">{order.note}</span>
                    </div>
                  )}

                  {order.rejectReason && (
                    <div className="flex items-start gap-1.5 mt-2 bg-red-100 rounded-lg px-2.5 py-1.5">
                      <span className="text-xs">⚠️</span>
                      <span className="text-xs text-red-700">{order.rejectReason}</span>
                    </div>
                  )}
                </div>

                {/* Total */}
                <div className="px-4 py-2 border-t border-black/5 flex items-center justify-between">
                  <span className="text-xs text-gray-500">ລວມ​ທັງ​ໝົດ</span>
                  <span className="font-bold text-gray-800 text-sm">{fmt(order.totalAmount)} ກີບ</span>
                </div>

                {/* Actions: pending → confirm/reject | confirmed → serve */}
                {isPending && (
                  <div className="px-3 pb-3 pt-1 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => confirm(order)}
                      disabled={isProcessing}
                      className="py-2.5 rounded-xl text-sm font-bold text-white transition disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
                      style={{ background: 'linear-gradient(135deg, #14532D, #16a34a)' }}
                    >
                      {isProcessing ? '...' : '✓ ຢືນ​ຢັນ'}
                    </button>
                    <button
                      onClick={() => { setRejectModal(order); setRejectReason('') }}
                      disabled={isProcessing}
                      className="py-2.5 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-700 text-white transition disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      ✕ ປະ​ຕິ​ເສດ
                    </button>
                  </div>
                )}

                {isConfirmed && (
                  <div className="px-3 pb-3 pt-1">
                    <button
                      onClick={() => markServed(order)}
                      disabled={isProcessing}
                      className="w-full py-3 rounded-xl text-sm font-bold text-white transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                      style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}
                    >
                      {isProcessing ? '...' : '🍽️ ເສີບ​ແລ້ວ'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setRejectModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">❌</div>
              <h2 className="text-lg font-bold text-gray-800">ປະ​ຕິ​ເສດ​ຄຳ​ສັ່ງ #{rejectModal.id}</h2>
              <p className="text-sm text-gray-500 mt-1">{rejectModal.booth.name}</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm space-y-1">
              {rejectModal.items.map((i) => (
                <div key={i.id} className="flex justify-between text-gray-700">
                  <span>{i.itemName} × {i.quantity}</span>
                  <span>{fmt(i.itemPrice * i.quantity)} ກີບ</span>
                </div>
              ))}
            </div>

            <form onSubmit={submitReject} className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  ເຫດ​ຜົນ (ຈຳ​ເປັນ)
                </label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {['ສິນ​ຄ້າ​ໝົດ', 'ໝົດ​ເວ​ລາ​ໃຫ້​ບໍ​ລິ​ການ', 'ຄິດ​ຄ່າ​ຜິດ', 'ອື່ນໆ'].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRejectReason(r)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition ${
                        rejectReason === r ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-600 hover:border-red-300'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="ຫຼື​ໃສ່​ເຫດ​ຜົນ​ເອງ..."
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button type="button" onClick={() => setRejectModal(null)}
                  className="border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition text-sm">
                  ຍົກ​ເລີກ
                </button>
                <button type="submit" disabled={!rejectReason.trim() || processing === rejectModal.id}
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-50 text-sm">
                  {processing === rejectModal.id ? '...' : 'ປະ​ຕິ​ເສດ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </>)}
    </div>
  )
}
