'use client'
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState, useCallback, FormEvent } from 'react'
import QRCode from 'qrcode'
import CheckoutModal from './CheckoutModal'

interface Booth {
  id: number
  name: string
  isOpen: boolean
  orderNum: number
  activeCount: number
  servedCount: number
  unservedCount: number
  canCheckout: boolean
  billRequested: boolean
}

interface OrderItem { name: string; price: number; quantity: number }
interface BoothOrder {
  id: number
  status: string
  totalAmount: number
  note: string
  rejectReason: string
  createdAt: string
  items: OrderItem[]
}

interface Props {
  showToast: (msg: string, type: 'success' | 'error') => void
}

const STATUS_LABEL: Record<string, { label: string; icon: string; badge: string }> = {
  pending:   { label: 'ລໍ​ຖ້າ',      icon: '⏳', badge: 'bg-amber-100 text-amber-700' },
  confirmed: { label: 'ກຳ​ລັງ​ກຽມ',  icon: '🍳', badge: 'bg-blue-100 text-blue-700' },
  served:    { label: 'ເສີບ​ແລ້ວ',   icon: '🍽️', badge: 'bg-green-100 text-green-700' },
  rejected:  { label: 'ປະ​ຕິ​ເສດ',  icon: '❌', badge: 'bg-red-100 text-red-700' },
  paid:      { label: 'ຈ່າຍ​ແລ້ວ',  icon: '💰', badge: 'bg-gray-100 text-gray-600' },
  cancelled: { label: 'ຍົກ​ເລີກ',   icon: '🚫', badge: 'bg-gray-100 text-gray-400' },
}

function fmt(n: number) { return new Intl.NumberFormat('lo-LA').format(n) }
function timeStr(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleString('lo-LA', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
}

export default function BoothsTab({ showToast }: Props) {
  const [booths, setBooths] = useState<Booth[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editBooth, setEditBooth] = useState<Booth | null>(null)
  const [formName, setFormName] = useState('')
  const [formOrder, setFormOrder] = useState(0)
  const [saving, setSaving] = useState(false)

  const [qrModal, setQrModal] = useState<{ booth: Booth; dataUrl: string } | null>(null)
  const [checkoutBooth, setCheckoutBooth] = useState<Booth | null>(null)

  // History drawer
  const [historyBooth, setHistoryBooth] = useState<Booth | null>(null)
  const [historyOrders, setHistoryOrders] = useState<BoothOrder[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [processingOrder, setProcessingOrder] = useState<number | null>(null)
  const [rejectingId, setRejectingId] = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const loadBooths = useCallback(async () => {
    const res = await fetch('/api/admin/booths')
    if (res.ok) setBooths(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { loadBooths() }, [loadBooths])

  async function openHistory(booth: Booth) {
    setHistoryBooth(booth)

    setHistoryLoading(true)
    try {
      const res = await fetch(`/api/order/${booth.id}/history`)
      if (res.ok) setHistoryOrders(await res.json())
    } finally {
      setHistoryLoading(false)
    }
  }

  function closeHistory() {
    setHistoryBooth(null)
    setHistoryOrders([])
    setRejectingId(null)
    setRejectReason('')
  }

  async function reloadHistory() {
    if (!historyBooth) return
    const res = await fetch(`/api/admin/orders?boothId=${historyBooth.id}`)
    if (res.ok) setHistoryOrders(await res.json())
    loadBooths()
  }

  async function confirmOrder(id: number) {
    setProcessingOrder(id)
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed' }),
      })
      if (!res.ok) throw new Error()
      showToast(`ຢືນ​ຢັນ​ຄຳ​ສັ່ງ #${id} ສຳ​ເລັດ`, 'success')
      await reloadHistory()
    } catch {
      showToast('ເກີດ​ຂໍ້​ຜິດ​ພາດ', 'error')
    } finally {
      setProcessingOrder(null)
    }
  }

  async function serveOrder(id: number) {
    setProcessingOrder(id)
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'served' }),
      })
      if (!res.ok) throw new Error()
      showToast(`🍽️ ເສີບ​ຄຳ​ສັ່ງ #${id} ສຳ​ເລັດ`, 'success')
      await reloadHistory()
    } catch {
      showToast('ເກີດ​ຂໍ້​ຜິດ​ພາດ', 'error')
    } finally {
      setProcessingOrder(null)
    }
  }

  async function submitReject(id: number) {
    if (!rejectReason.trim()) return
    setProcessingOrder(id)
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected', rejectReason }),
      })
      if (!res.ok) throw new Error()
      showToast(`ປະ​ຕິ​ເສດ​ຄຳ​ສັ່ງ #${id}`, 'success')
      setRejectingId(null)
      setRejectReason('')
      await reloadHistory()
    } catch {
      showToast('ເກີດ​ຂໍ້​ຜິດ​ພາດ', 'error')
    } finally {
      setProcessingOrder(null)
    }
  }

  function openForm(booth?: Booth) {
    setEditBooth(booth || null)
    setFormName(booth?.name || '')
    setFormOrder(booth?.orderNum ?? 0)
    setShowForm(true)
  }

  async function handleSaveBooth(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const url = editBooth ? `/api/admin/booths/${editBooth.id}` : '/api/admin/booths'
      const method = editBooth ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName, orderNum: formOrder }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      showToast(editBooth ? 'ແກ້ໄຂ​ຕູບ​ສຳ​ເລັດ' : 'ເພີ່ມ​ຕູບ​ສຳ​ເລັດ', 'success')
      setShowForm(false)
      loadBooths()
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'ເກີດ​ຂໍ້​ຜິດ​ພາດ', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function toggleBooth(booth: Booth) {
    const res = await fetch(`/api/admin/booths/${booth.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isOpen: !booth.isOpen }),
    })
    if (res.ok) {
      showToast(booth.isOpen ? `ປິດ ${booth.name}` : `ເປີດ ${booth.name}`, 'success')
      loadBooths()
    }
  }

  async function deleteBooth(booth: Booth) {
    if (!confirm(`ລຶບ "${booth.name}" ອອກ?`)) return
    const res = await fetch(`/api/admin/booths/${booth.id}`, { method: 'DELETE' })
    if (res.ok) {
      showToast('ລຶບ​ຕູບ​ສຳ​ເລັດ', 'success')
      loadBooths()
    }
  }

  async function showQR(booth: Booth) {
    const url = `${window.location.origin}/order/${booth.id}`
    const dataUrl = await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: { dark: '#14532D', light: '#FFFFFF' },
    })
    setQrModal({ booth, dataUrl })
  }

  function printQR(booth: Booth, dataUrl: string) {
    const css = `
      body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#fff;font-family:'Phetsarath OT','Phetsarath',sans-serif}
      .card{text-align:center;padding:32px;border:2px dashed #14532D;border-radius:16px;max-width:280px}
      img{width:220px;height:220px}
      h1{color:#14532D;font-size:1.4rem;margin:12px 0 4px}
      p{color:#666;font-size:0.85rem;margin:0}
    `
    const w = window.open('', '_blank')!
    w.document.title = `QR - ${booth.name}`
    const style = w.document.createElement('style')
    style.textContent = css
    w.document.head.appendChild(style)
    w.document.body.innerHTML = `
      <div class="card">
        <img src="${dataUrl}" alt="QR">
        <h1>${booth.name}</h1>
        <p>ສ/ແກ QR ເພື່ອ​ສັ່ງ​ອາ​ຫານ</p>
      </div>`
    w.onload = () => w.print()
    setTimeout(() => w.print(), 300)
  }

  // Filter history orders
  const historyTotal = historyOrders
    .filter((o) => !['rejected', 'cancelled'].includes(o.status))
    .reduce((s, o) => s + o.totalAmount, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-800">ຈັດ​ການ​ຕູບ</h1>
        <button
          onClick={() => openForm()}
          className="text-sm font-semibold px-4 py-2 rounded-xl text-white flex items-center gap-1.5 transition"
          style={{ background: 'linear-gradient(135deg, #14532D, #16a34a)' }}
        >
          + ເພີ່ມ​ຕູບ
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">ກຳ​ລັງ​ໂຫ​ຼດ...</div>
      ) : booths.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl text-gray-400">
          <div className="text-5xl mb-3 opacity-30">🏡</div>
          <p>ຍັງ​ບໍ່​ມີ​ຕູບ. ກົດ &quot;ເພີ່ມ​ຕູບ&quot; ເພື່ອ​ເລີ່ມ</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {booths.map((booth) => (
            <div
              key={booth.id}
              className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all ${
                booth.isOpen ? 'border-green-200 shadow-green-100' : 'border-gray-200'
              }`}
            >
              {/* Booth header */}
              <div
                className="px-4 py-3 flex items-center justify-between"
                style={{
                  background: booth.billRequested
                    ? 'linear-gradient(135deg, #78350f, #d97706)'
                    : booth.isOpen
                    ? 'linear-gradient(135deg, #14532D, #16a34a)'
                    : '#f3f4f6',
                }}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${booth.isOpen ? 'bg-lime-300' : 'bg-gray-400'}`} />
                  <span className={`font-bold text-sm ${booth.isOpen ? 'text-white' : 'text-gray-600'}`}>
                    {booth.name}
                  </span>
                  {booth.billRequested && (
                    <span className="text-xs font-bold bg-white text-amber-700 px-2 py-0.5 rounded-full animate-pulse">
                      💳 ຂໍ​ເຊັກ​ບິນ
                    </span>
                  )}
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  booth.isOpen ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {booth.isOpen ? 'ເປີດ​ຢູ່' : 'ປິດ​ຢູ່'}
                </span>
              </div>

              {/* Orders status summary */}
              <div className="px-4 py-3 border-b border-gray-50">
                <p className="text-xs text-gray-500 mb-1.5">ສະ​ຖາ​ນະ​ໃນ​ໂຕະ</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {booth.activeCount === 0 ? (
                    <span className="text-sm text-gray-400">ບໍ່​ມີ​ລາຍ​ການ</span>
                  ) : (
                    <>
                      {booth.unservedCount > 0 && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                          ⏳ {booth.unservedCount} ກຳ​ລັງ​ດຳ​ເນີນ
                        </span>
                      )}
                      {booth.servedCount > 0 && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                          🍽️ {booth.servedCount} ເສີບ​ແລ້ວ
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="p-3 space-y-2">
                {/* Open/Close toggle */}
                <button
                  onClick={() => toggleBooth(booth)}
                  className={`w-full py-2.5 rounded-xl text-sm font-bold transition ${
                    booth.isOpen
                      ? 'bg-red-50 text-red-700 hover:bg-red-100'
                      : 'bg-green-50 text-green-700 hover:bg-green-100'
                  }`}
                >
                  {booth.isOpen ? '🔒 ປິດ​ຕູບ' : '🔓 ເປີດ​ຕູບ'}
                </button>

                {/* View orders history */}
                <button
                  onClick={() => openHistory(booth)}
                  className="w-full py-2.5 rounded-xl text-sm font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition flex items-center justify-center gap-1.5"
                >
                  📋 ເບິ່ງ​ປະ​ຫວັດ​ອໍ​ເດີ້
                </button>

                {/* Checkout */}
                <div>
                  <button
                    onClick={() => setCheckoutBooth(booth)}
                    disabled={!booth.canCheckout}
                    className="w-full py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-40 disabled:cursor-not-allowed"
                    style={
                      booth.canCheckout
                        ? { background: 'linear-gradient(135deg, #14532D, #16a34a)', color: 'white' }
                        : { background: '#f9fafb', color: '#9ca3af', border: '1px solid #e5e7eb' }
                    }
                  >
                    💰 ເຊັກ​ບິນ
                  </button>
                  {booth.activeCount > 0 && !booth.canCheckout && (
                    <p className="text-xs text-amber-600 text-center mt-1">
                      ⏳ ຕ້ອງ​ເສີບ​ໃຫ້​ຄົບ​ກ່ອນ​ເຊັກ​ບິນ
                    </p>
                  )}
                </div>

                {/* QR + edit/delete row */}
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => showQR(booth)}
                    className="py-2 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
                  >
                    📱 QR
                  </button>
                  <button
                    onClick={() => openForm(booth)}
                    className="py-2 rounded-xl text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 transition"
                  >
                    ✏️ ແກ້ໄຂ
                  </button>
                  <button
                    onClick={() => deleteBooth(booth)}
                    className="py-2 rounded-xl text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100 transition"
                  >
                    🗑 ລຶບ
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ====== ORDER HISTORY DRAWER ====== */}
      {historyBooth && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={closeHistory}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-3xl max-h-[92vh] sm:max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer header */}
            <div
              className="px-5 py-4 flex items-center justify-between flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #14532D, #16a34a)' }}
            >
              <div className="text-white">
                <p className="text-xs text-green-200 font-medium">📋 ປະ​ຫວັດ​ອໍ​ເດີ້</p>
                <h2 className="text-lg font-bold">{historyBooth.name}</h2>
              </div>
              <button onClick={closeHistory} className="text-white/70 hover:text-white text-2xl leading-none">×</button>
            </div>

            {/* Session label */}
            <div className="px-4 py-2 bg-green-50 border-b border-green-100 flex-shrink-0">
              <p className="text-xs text-green-700 font-medium">
                📌 ຄຳ​ສັ່ງ​ໃນ​ຮອບ​ນີ້ ({historyOrders.length} ລາ​ຍ​ການ)
              </p>
            </div>

            {/* Orders list */}
            <div className="flex-1 overflow-y-auto">
              {historyLoading ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-3xl mb-2 animate-bounce">🍃</div>
                  <p className="text-sm">ກຳ​ລັງ​ໂຫ​ຼດ...</p>
                </div>
              ) : historyOrders.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <div className="text-4xl mb-3 opacity-30">📭</div>
                  <p className="text-sm">ຍັງ​ບໍ່​ມີ​ຄຳ​ສັ່ງ​ໃນ​ຮອບ​ນີ້</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {historyOrders.map((order) => {
                    const cfg = STATUS_LABEL[order.status] ?? STATUS_LABEL.pending
                    return (
                      <div key={order.id} className="px-5 py-4">
                        {/* Order row header */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-700 text-sm">#{order.id}</span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                              {cfg.icon} {cfg.label}
                            </span>
                          </div>
                          <span className="text-xs text-gray-400">{timeStr(order.createdAt)}</span>
                        </div>

                        {/* Items */}
                        <div className="space-y-0.5 mb-2">
                          {order.items.map((item, i) => (
                            <div key={i} className="flex justify-between text-sm">
                              <span className="text-gray-700">
                                {item.name}
                                <span className="text-gray-400 ml-1">× {item.quantity}</span>
                              </span>
                              <span className="text-gray-500 text-xs">{fmt(item.price * item.quantity)} ກີບ</span>
                            </div>
                          ))}
                        </div>

                        {/* Note / reject reason */}
                        {order.note && (
                          <p className="text-xs text-gray-400 italic mb-1.5">📝 {order.note}</p>
                        )}
                        {order.rejectReason && (
                          <p className="text-xs text-red-500 mb-1.5">⚠️ {order.rejectReason}</p>
                        )}

                        {/* Total + actions */}
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-sm font-bold text-gray-800">{fmt(order.totalAmount)} ກີບ</span>
                          <div className="flex gap-1.5">
                            {order.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => confirmOrder(order.id)}
                                  disabled={processingOrder === order.id}
                                  className="text-xs font-bold px-3 py-1.5 rounded-lg text-white disabled:opacity-50 transition"
                                  style={{ background: 'linear-gradient(135deg, #14532D, #16a34a)' }}
                                >
                                  {processingOrder === order.id ? '...' : '✓ ຢືນ​ຢັນ'}
                                </button>
                                <button
                                  onClick={() => { setRejectingId(order.id); setRejectReason('') }}
                                  disabled={processingOrder === order.id}
                                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-600 text-white disabled:opacity-50 transition"
                                >
                                  ✕
                                </button>
                              </>
                            )}
                            {order.status === 'confirmed' && (
                              <button
                                onClick={() => serveOrder(order.id)}
                                disabled={processingOrder === order.id}
                                className="text-xs font-bold px-3 py-1.5 rounded-lg text-white disabled:opacity-50 transition"
                                style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}
                              >
                                {processingOrder === order.id ? '...' : '🍽️ ເສີບ​ແລ້ວ'}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Inline reject reason input */}
                        {rejectingId === order.id && (
                          <div className="mt-2 bg-red-50 rounded-xl p-3 space-y-2">
                            <div className="flex flex-wrap gap-1.5">
                              {['ສິນ​ຄ້າ​ໝົດ', 'ໝົດ​ເວ​ລາ', 'ຄິດ​ຄ່າ​ຜິດ', 'ອື່ນໆ'].map((r) => (
                                <button
                                  key={r}
                                  type="button"
                                  onClick={() => setRejectReason(r)}
                                  className={`text-xs px-2.5 py-1 rounded-lg border transition ${
                                    rejectReason === r
                                      ? 'border-red-500 bg-red-100 text-red-700 font-bold'
                                      : 'border-gray-200 text-gray-600 bg-white'
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
                              placeholder="ຫຼື​ໃສ່​ເຫດ​ຜົນ..."
                              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => { setRejectingId(null); setRejectReason('') }}
                                className="flex-1 text-xs font-semibold py-1.5 rounded-lg border border-gray-300 text-gray-600"
                              >
                                ຍົກ​ເລີກ
                              </button>
                              <button
                                onClick={() => submitReject(order.id)}
                                disabled={!rejectReason.trim() || processingOrder === order.id}
                                className="flex-1 text-xs font-bold py-1.5 rounded-lg bg-red-600 text-white disabled:opacity-50 transition"
                              >
                                {processingOrder === order.id ? '...' : 'ປະ​ຕິ​ເສດ'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer summary */}
            {!historyLoading && historyOrders.length > 0 && (
              <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50 flex-shrink-0">
                <span className="text-sm text-gray-500">{historyOrders.length} ຄຳ​ສັ່ງ</span>
                <span className="text-base font-bold text-green-800">ລວມ {fmt(historyTotal)} ກີບ</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add/Edit form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              {editBooth ? 'ແກ້ໄຂ​ຕູບ' : 'ເພີ່ມ​ຕູບ​ໃໝ່'}
            </h2>
            <form onSubmit={handleSaveBooth} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">ຊື່​ຕູບ <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="ຕູບ A, ຕູບ 1..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">ລຳ​ດັບ</label>
                <input
                  type="number"
                  value={formOrder}
                  onChange={(e) => setFormOrder(parseInt(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  min={0}
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition text-sm">
                  ຍົກ​ເລີກ
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-50 text-sm"
                  style={{ background: 'linear-gradient(135deg, #14532D, #16a34a)' }}>
                  {saving ? 'ກຳ​ລັງ​ບັນ​ທຶກ...' : 'ບັນ​ທຶກ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {qrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setQrModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 text-center max-w-xs w-full" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3">
              <p className="text-xs text-green-600 font-medium tracking-wide mb-1">🌿 QR CODE</p>
              <h2 className="text-xl font-bold text-green-900">{qrModal.booth.name}</h2>
              <p className="text-xs text-gray-400 mt-1">ສ/ແກ QR ເພື່ອ​ສັ່ງ​ອາ​ຫານ</p>
            </div>
            <img
              src={qrModal.dataUrl}
              alt="QR Code"
              className="mx-auto rounded-xl border border-green-100"
              style={{ width: 220, height: 220 }}
            />
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setQrModal(null)}
                className="flex-1 border border-gray-300 text-gray-600 font-semibold py-2.5 rounded-xl text-sm hover:bg-gray-50"
              >
                ປິດ
              </button>
              <button
                onClick={() => printQR(qrModal.booth, qrModal.dataUrl)}
                className="flex-1 text-white font-semibold py-2.5 rounded-xl text-sm"
                style={{ background: 'linear-gradient(135deg, #14532D, #16a34a)' }}
              >
                🖨 ພິມ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {checkoutBooth && (
        <CheckoutModal
          booth={checkoutBooth}
          onClose={() => setCheckoutBooth(null)}
          onPaid={loadBooths}
          showToast={showToast}
        />
      )}
    </div>
  )
}
