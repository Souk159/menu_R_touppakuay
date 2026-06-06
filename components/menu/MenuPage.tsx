'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

interface MenuItem {
  id: number
  name: string
  description: string
  price: number
  imageUrl: string
  isAvailable: boolean
}

interface Category {
  id: number
  name: string
  description: string
  items: MenuItem[]
}

interface Props {
  categories: Category[]
  settings: Record<string, string>
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('lo-LA').format(price) + ' ກີບ'
}

export default function MenuPage({ categories, settings }: Props) {
  const [activeId, setActiveId] = useState<number>(categories[0]?.id ?? 0)
  const sectionRefs = useRef<Map<number, HTMLElement>>(new Map())
  const tabRefs = useRef<Map<number, HTMLButtonElement>>(new Map())
  const [brokenImages, setBrokenImages] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (settings.name) document.title = settings.name
  }, [settings.name])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = parseInt(entry.target.id.replace('cat-', ''))
            setActiveId(id)
          }
        })
      },
      { threshold: 0.25, rootMargin: '-64px 0px -55% 0px' }
    )
    sectionRefs.current.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [categories])

  useEffect(() => {
    const tab = tabRefs.current.get(activeId)
    tab?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [activeId])

  function scrollTo(id: number) {
    const el = sectionRefs.current.get(id)
    if (!el) return
    const y = el.getBoundingClientRect().top + window.scrollY - 64
    window.scrollTo({ top: y, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen" style={{ fontFamily: 'Phetsarath OT, Phetsarath, sans-serif', backgroundColor: '#f0fdf4' }}>
      {/* ====== HERO HEADER ====== */}
      <header
        className="relative overflow-hidden text-white"
        style={{ background: 'linear-gradient(135deg, #052e16 0%, #14532D 45%, #15803D 80%, #4ade80 100%)' }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(circle at 15% 85%, rgba(255,255,255,0.08) 0%, transparent 50%), radial-gradient(circle at 85% 15%, rgba(255,255,255,0.06) 0%, transparent 50%)',
          }}
        />
        <div className="relative z-10 text-center px-4 py-14 md:py-20">
          <h1
            className="text-3xl md:text-5xl font-bold tracking-wide drop-shadow-lg"
            style={{ fontFamily: 'Phetsarath OT, Phetsarath, serif' }}
          >
            {settings.name || 'ຮ້ານອາຫານ'}
          </h1>
          {settings.tagline && (
            <p className="mt-3 text-base md:text-lg opacity-85 max-w-lg mx-auto">
              {settings.tagline}
            </p>
          )}
          {(settings.phone || settings.address) && (
            <p className="mt-3 text-sm opacity-70">
              {settings.phone && `☎ ${settings.phone}`}
              {settings.phone && settings.address && '  ·  '}
              {settings.address}
            </p>
          )}
        </div>
      </header>

      {/* ====== CATEGORY TABS ====== */}
      {categories.length > 0 && (
        <nav className="sticky top-0 z-40 bg-white shadow-sm border-b border-gray-100">
          <div className="flex overflow-x-auto scrollbar-hide px-2 max-w-6xl mx-auto">
            {categories.map((cat) => (
              <button
                key={cat.id}
                ref={(el) => { if (el) tabRefs.current.set(cat.id, el) }}
                onClick={() => scrollTo(cat.id)}
                className={`flex-shrink-0 px-4 md:px-6 py-4 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                  activeId === cat.id
                    ? 'text-green-700 border-green-600'
                    : 'text-gray-500 border-transparent hover:text-green-600 hover:border-green-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* ====== MENU CONTENT ====== */}
      <main className="max-w-6xl mx-auto px-4 py-8 pb-16">
        {categories.length === 0 ? (
          <div className="text-center py-28 text-gray-400">
            <div className="text-7xl mb-5 opacity-40">🍜</div>
            <p className="text-xl font-medium">ຍັງບໍ່ມີເມນູໃນຂະນີ້</p>
          </div>
        ) : (
          categories.map((cat) => (
            <section
              key={cat.id}
              id={`cat-${cat.id}`}
              ref={(el) => { if (el) sectionRefs.current.set(cat.id, el) }}
              className="mb-12 scroll-mt-16"
            >
              {/* Category heading */}
              <div className="flex items-center gap-3 mb-1">
                <span className="w-1.5 h-7 rounded-full bg-green-600 flex-shrink-0" />
                <h2
                  className="text-xl md:text-2xl font-bold text-green-900"
                  style={{ fontFamily: 'Phetsarath OT, Phetsarath, serif' }}
                >
                  {cat.name}
                </h2>
              </div>
              {cat.description && (
                <p className="text-gray-500 text-sm mb-4 ml-5">{cat.description}</p>
              )}

              {/* Item grid */}
              {cat.items.length === 0 ? (
                <p className="ml-5 text-sm text-gray-400 mt-3">ບໍ່ມີລາຍການໃນໝວດນີ້</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 mt-4">
                  {cat.items.map((item) => (
                    <div
                      key={item.id}
                      className={`bg-white rounded-2xl shadow-sm overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-md ${
                        !item.isAvailable ? 'opacity-65' : ''
                      }`}
                    >
                      {/* Image */}
                      <div className="relative aspect-[4/3] overflow-hidden bg-amber-50">
                        {item.imageUrl && !brokenImages.has(item.id) ? (
                          <Image
                            src={item.imageUrl}
                            alt={item.name}
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            className="object-cover transition-transform duration-300 hover:scale-105"
                            onError={() => setBrokenImages((prev) => new Set([...prev, item.id]))}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-amber-50 to-orange-100">
                            🍜
                          </div>
                        )}
                        {!item.isAvailable && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full tracking-wide">
                              ໝົດແລ້ວ
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-3 md:p-4">
                        <h3 className="font-bold text-gray-800 text-sm leading-snug mb-1 line-clamp-2">
                          {item.name}
                        </h3>
                        {item.description && (
                          <p className="text-xs text-gray-500 mb-2 line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                        <p className="font-bold text-green-700 text-sm md:text-base">
                          {formatPrice(item.price)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))
        )}
      </main>

      {/* ====== FOOTER ====== */}
      <footer
        className="text-center py-6 px-4 text-sm"
        style={{ background: '#052e16', color: 'rgba(255,255,255,0.75)' }}
      >
        <p>
          {settings.name || 'ຮ້ານອາຫານ'}
          {settings.address && ` · ${settings.address}`}
          {settings.phone && ` · ☎ ${settings.phone}`}
        </p>
        <a
          href="/admin"
          className="inline-block mt-3 text-xs px-3 py-1 rounded-full border border-white/20 text-white/40 hover:text-white/70 hover:border-white/40 transition"
        >
          ⚙ ຜູ້​ດູ​ແລ
        </a>
      </footer>
    </div>
  )
}
