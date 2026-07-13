'use client'

import { useState } from 'react'
import Image from 'next/image'

interface PosterImageProps {
  src: string
  alt: string
  title: string
  sizes?: string
}

const DEFAULT_SIZES =
  '(min-width: 1536px) 14vw, (min-width: 1280px) 16vw, (min-width: 1024px) 20vw, (min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw'

export default function PosterImage({ src, alt, title, sizes }: PosterImageProps) {
  const [errored, setErrored] = useState(false)

  if (errored) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-800 px-3 text-center text-sm text-gray-500">
        {title}
      </div>
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes ?? DEFAULT_SIZES}
      className="object-cover"
      onError={() => setErrored(true)}
    />
  )
}
