import { readFile, stat } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const artworkRoot = new URL('../../../public/cinematic-breach/', import.meta.url)
const artworkNames = ['case-front-door', 'case-quiet-room', 'case-vault'] as const
const widths = [640, 1280] as const
const formats = ['avif', 'webp'] as const

async function fileSize(relativePath: string): Promise<number> {
  return (await stat(new URL(relativePath, artworkRoot))).size
}

describe('responsive home case artwork assets', () => {
  it.each(artworkNames)('%s ships valid AVIF and WebP variants at both width tiers', async (name) => {
    const originalSize = await fileSize(`${name}.webp`)

    for (const width of widths) {
      for (const format of formats) {
        const relativePath = `${name}-${width}.${format}`
        const [header, optimizedSize] = await Promise.all([
          readFile(new URL(relativePath, artworkRoot)).then((file) => file.subarray(0, 16)),
          fileSize(relativePath),
        ])

        if (format === 'avif') {
          expect(header.subarray(4, 12).toString('ascii')).toBe('ftypavif')
        } else {
          expect(header.subarray(0, 4).toString('ascii')).toBe('RIFF')
          expect(header.subarray(8, 12).toString('ascii')).toBe('WEBP')
        }

        expect(optimizedSize).toBeLessThan(originalSize)
      }
    }
  })

  it.each(formats)('keeps each %s responsive tier below half the original transfer', async (format) => {
    const originalTotal = (
      await Promise.all(artworkNames.map((name) => fileSize(`${name}.webp`)))
    ).reduce((total, size) => total + size, 0)

    for (const width of widths) {
      const optimizedTotal = (
        await Promise.all(
          artworkNames.map((name) => fileSize(`${name}-${width}.${format}`)),
        )
      ).reduce((total, size) => total + size, 0)

      expect(optimizedTotal).toBeLessThan(originalTotal / 2)
    }
  })
})
