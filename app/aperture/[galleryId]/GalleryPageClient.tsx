'use client'

import { useState, useEffect } from 'react'
import ImageHeader from '@/components/ImageHeader'
import './GalleryPage.css'
import TextSection from '@/components/TextSection'

interface ImageData {
  src: string
  alt: string
}

interface GalleryPageClientProps {
  galleryId: string
}

export default function GalleryPageClient({ galleryId }: GalleryPageClientProps) {
  const [markdown, setMarkdown] = useState('')
  const [images, setImages] = useState<ImageData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null)

  useEffect(() => {
    const getAssetPath = (path: string) => {
      if (process.env.NODE_ENV === 'development' || (typeof window !== 'undefined' && window.location.hostname === 'localhost')) {
        return path
      }
      return path
    }
    
    const locations = [
      `/content/aperture/${galleryId}.md`,
      `/content/galleries/${galleryId}.md`,
      `/aperture/${galleryId}.md`,
    ]
    
    const tryNextLocation = (index: number): Promise<string> => {
      if (index >= locations.length) {
        throw new Error(`Failed to load markdown for gallery: ${galleryId}`)
      }
      
      return fetch(locations[index])
        .then(response => {
          if (!response.ok) {
            return tryNextLocation(index + 1)
          }
          return response.text()
        })
    }
    
    tryNextLocation(0)
      .then(text => {
        setMarkdown(text)
        fetchGalleryImages(galleryId)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
    
    const fetchGalleryImages = (folderName: string) => {
      fetch(`/images/${folderName}/manifest.json`)
        .then(response => {
          if (!response.ok) {
            throw new Error('Manifest not found')
          }
          return response.json()
        })
        .then(data => {
          if (data && data.images) {
            setImages(data.images.map((img: string) => ({
              src: getAssetPath(`/images/${galleryId}/${img}`),
              alt: img.replace(/\.\w+$/, '')
            })))
          } else {
            throw new Error('No images in manifest')
          }
          setLoading(false)
        })
        .catch(err => {
          setError(err.message)
          setLoading(false)
        })
    }
  }, [galleryId])

  const handleImageClick = (imageSrc: string) => {
    setEnlargedImage(imageSrc)
  }

  const closeOverlay = () => {
    setEnlargedImage(null)
  }

  if (loading) {
    return <div>Loading...</div>
  }

  if (error) {
    return <div>Error: {error}</div>
  }

  return (
    <div>
      <ImageHeader markdown={markdown} />
      
      {/* Image Grid */}
      <div className='gallery-container'>
        <div className='gallery-grid'>
          {images.map((image, index) => (
            <div 
              key={index} 
              className='gallery-item'
              onClick={() => handleImageClick(image.src)}
            >
              <img 
                src={image.src} 
                alt={image.alt} 
                className='gallery-image'
                loading='lazy'
              />
            </div>
          ))}
        </div>
      </div>

      {/* Enlarged Image Overlay */}
      {enlargedImage && (
        <div className='overlay' onClick={closeOverlay}>
          <div className='overlay-content'>
            <img 
              src={enlargedImage} 
              alt='Enlarged' 
              className='enlarged-image'
            />
          </div>
        </div>
      )}
      <TextSection markdown={markdown} />
    </div>
  )
}
