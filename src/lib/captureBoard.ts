import { domToPng } from 'modern-screenshot'

function letterDataUrl(letter: string, size = 104): string {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  const gradient = ctx.createLinearGradient(0, 0, size, size)
  gradient.addColorStop(0, '#3b82f6')
  gradient.addColorStop(1, '#1d4ed8')
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#ffffff'
  ctx.font = `700 ${Math.round(size * 0.42)}px "DM Sans", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText((letter || '?').slice(0, 1).toUpperCase(), size / 2, size / 2 + 1)

  return canvas.toDataURL('image/png')
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Falha ao ler imagem'))
    reader.readAsDataURL(blob)
  })
}

async function fetchAsDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { credentials: 'omit' })
    if (!response.ok) return null
    const blob = await response.blob()
    if (!blob.type.startsWith('image/')) return null
    return await blobToDataUrl(blob)
  } catch {
    return null
  }
}

/**
 * Converte a URL do avatar em data URL.
 * Usa proxy local (/api/image-proxy) para contornar CORS e manter a foto real.
 */
async function imageToDataUrl(src: string): Promise<string | null> {
  if (!src || src.startsWith('data:')) return src || null

  // 1) Proxy same-origin (dev server) — melhor caminho para foto real
  const proxied = `/api/image-proxy?url=${encodeURIComponent(src)}`
  const viaProxy = await fetchAsDataUrl(proxied)
  if (viaProxy) return viaProxy

  // 2) Fetch direto (só funciona se o host liberar CORS)
  const direct = await fetchAsDataUrl(src)
  if (direct) return direct

  // 3) Proxy público de imagem (fallback)
  const viaWsrv = await fetchAsDataUrl(
    `https://wsrv.nl/?url=${encodeURIComponent(src)}&output=png`,
  )
  if (viaWsrv) return viaWsrv

  return null
}

async function prepareCloneImages(root: HTMLElement) {
  const images = [...root.querySelectorAll('img')]

  await Promise.all(
    images.map(async (img) => {
      const src = img.getAttribute('src') || img.currentSrc || img.src
      const alt = img.getAttribute('alt') || '?'
      const inlined = await imageToDataUrl(src)
      img.removeAttribute('crossorigin')
      img.src = inlined || letterDataUrl(alt)
    }),
  )

  // garante que todas as data URLs pintaram
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve()
            return
          }
          img.onload = () => resolve()
          img.onerror = () => resolve()
        }),
    ),
  )
}

/**
 * Captura só o board (fileiras + classes), com os avatares das URLs.
 */
export async function captureBoardPng(boardEl: HTMLElement): Promise<string> {
  const width = boardEl.offsetWidth
  const clone = boardEl.cloneNode(true) as HTMLElement
  clone.classList.add('board--capture')
  clone.querySelectorAll('.avatar--ghost').forEach((node) => node.remove())
  clone.querySelectorAll('.tier--over').forEach((node) => node.classList.remove('tier--over'))

  clone.style.position = 'fixed'
  clone.style.left = '-10000px'
  clone.style.top = '0'
  clone.style.width = `${width}px`
  clone.style.zIndex = '-1'
  clone.style.pointerEvents = 'none'
  document.body.appendChild(clone)

  try {
    await prepareCloneImages(clone)
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
    await new Promise((resolve) => setTimeout(resolve, 50))

    return await domToPng(clone, {
      scale: 2,
      backgroundColor: '#0e1014',
      quality: 1,
    })
  } finally {
    clone.remove()
  }
}
