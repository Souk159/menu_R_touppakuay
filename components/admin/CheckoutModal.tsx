'use client'

import { useState, useEffect } from 'react'

interface OrderItem {
  id: number
  itemName: string
  itemPrice: number
  quantity: number
}
interface Order {
  id: number
  totalAmount: number
  note: string
  createdAt: string
  items: OrderItem[]
}
interface Booth { id: number; name: string }

interface Props {
  booth: Booth
  onClose: () => void
  onPaid: () => void
  showToast: (msg: string, type: 'success' | 'error') => void
}

function fmt(n: number) { return new Intl.NumberFormat('lo-LA').format(n) }

export default function CheckoutModal({ booth, onClose, onPaid, showToast }: Props) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash')
  const [amountInput, setAmountInput] = useState('')
  const [paying, setPaying] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/orders?boothId=${booth.id}&status=served`)
      .then((r) => r.json())
      .then(setOrders)
      .finally(() => setLoading(false))
  }, [booth.id])

  const grandTotal = orders.reduce((s, o) => s + o.totalAmount, 0)
  const received = parseFloat(amountInput) || 0
  const change = received - grandTotal

  async function handlePay() {
    if (paymentMethod === 'cash' && received < grandTotal) {
      showToast('ຈຳນວນເງິນບໍ່ພໍ', 'error')
      return
    }
    setPaying(true)
    try {
      await Promise.all([
        ...orders.map((o) =>
          fetch(`/api/admin/orders/${o.id}/pay`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentMethod, paymentAmount: paymentMethod === 'cash' ? received : grandTotal }),
          })
        ),
        fetch(`/api/order/${booth.id}/bill-request`, { method: 'DELETE' }),
      ])
      showToast('ຮັບ​ເງິນ​ສຳ​ເລັດ ✓', 'success')
      onPaid()
      onClose()
    } finally {
      setPaying(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #14532D, #15803D)', borderRadius: '1rem 1rem 0 0' }}>
          <div>
            <p className="text-green-200 text-xs">ເຊັກ​ບິນ</p>
            <h2 className="text-white font-bold text-lg">{booth.name}</h2>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-2xl leading-none">×</button>
        </div>

        {/* Order items */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="text-center py-8 text-gray-400">ກຳ​ລັງ​ໂຫ​ຼດ...</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <div className="text-4xl mb-2">📭</div>
              <p>ບໍ່ມີ​ຄຳ​ສັ່ງ​ທີ່​ຄ້າງ​ຢູ່</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order, idx) => (
                <div key={order.id} className="border border-green-100 rounded-xl overflow-hidden">
                  <div className="bg-green-50 px-3 py-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-green-700">ຄຳ​ສັ່ງ #{idx + 1}</span>
                    {order.note && <span className="text-xs text-gray-500">📝 {order.note}</span>}
                  </div>
                  <div className="px-3 py-2 space-y-1.5">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">{item.itemName} × {item.quantity}</span>
                        <span className="font-medium text-gray-800">{fmt(item.itemPrice * item.quantity)} ກີບ</span>
                      </div>
                    ))}
                    <div className="border-t border-gray-100 pt-1.5 flex justify-between text-sm font-bold">
                      <span>ລວມ</span>
                      <span className="text-green-700">{fmt(order.totalAmount)} ກີບ</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {orders.length > 0 && (
          <div className="px-5 py-4 border-t bg-gray-50 space-y-4 rounded-b-2xl">
            {/* Grand total */}
            <div className="flex justify-between items-center text-lg font-bold">
              <span className="text-gray-700">ລວມ​ທັງ​ໝົດ</span>
              <span className="text-green-800">{fmt(grandTotal)} ກີບ</span>
            </div>

            {/* Payment method */}
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-2">ວິ​ທີ​ຊຳ​ລະ</p>
              <div className="grid grid-cols-2 gap-2">
                {(['cash', 'transfer'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setPaymentMethod(m)}
                    className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition ${
                      paymentMethod === m
                        ? 'border-green-600 bg-green-600 text-white'
                        : 'border-gray-200 text-gray-600 hover:border-green-400'
                    }`}
                  >
                    {m === 'cash' ? '💵 ສົດ' : '📱 ໂອນ'}
                  </button>
                ))}
              </div>
            </div>

            {/* Cash amount input */}
            {paymentMethod === 'cash' && (
              <div>
                <label className="text-sm font-semibold text-gray-600 mb-1.5 block">ຈຳ​ນວນ​ທີ່​ຮັບ (ກີບ)</label>
                <input
                  type="number"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 text-right text-lg font-bold"
                  placeholder="0"
                  step={1000}
                  min={0}
                />
                {received > 0 && (
                  <div className={`flex justify-between mt-2 px-1 text-sm font-bold ${change >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    <span>ເງິນ​ທອນ</span>
                    <span>{fmt(Math.max(0, change))} ກີບ</span>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handlePay}
              disabled={paying || (paymentMethod === 'cash' && (!amountInput || received < grandTotal))}
              className="w-full py-3.5 rounded-xl text-white font-bold text-sm disabled:opacity-40 transition"
              style={{ background: 'linear-gradient(135deg, #14532D, #16a34a)' }}
            >
              {paying ? 'ກຳ​ລັງ​ດຳ​ເນີນ​ການ...' : '✓ ຢືນ​ຢັນ​ຮັບ​ເງິນ'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
