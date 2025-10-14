'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './GalleryContent.css'

interface GalleryContentProps {
  markdown: string
  onImageClick?: (galleryId: string) => void
}

export default function GalleryContent({ markdown, onImageClick }: GalleryContentProps) {
  const lines = markdown.split('\n')
  const contentStart = lines.findIndex(line => line.startsWith('---'))
  const remainingText = contentStart !== -1 ? lines.slice(contentStart + 1).join('\n') : ''

  const handleImageContainerClick = (href?: string) => {
    if (onImageClick && href) {
      const galleryId = href.split('/').pop()
      if (galleryId) onImageClick(galleryId)
    }
  }

  return (
    <div className='image-gallery-container'>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ node, ...props }: any) => {
            const hasImage = node?.children?.some((child: any) => child.tagName === 'img')
            if (hasImage) {
              return <div className='image-wrapper'>{props.children}</div>
            }
            return <div className='text-wrapper'><p {...props} /></div>
          },
          a: ({ node, ...props }: any) => (
            <div 
              className='image-container' 
              onClick={() => handleImageContainerClick(props.href)}
              >
              <a 
                {...props} 
                className='image-link' 
                onClick={(e) => {
                  e.preventDefault()
                }}
              >
                {props.children}
              </a>
            </div>
          ),
          img: ({ node, ...props }: any) => (
            <>
              <img 
                {...props} 
                src={props.src} 
                alt={props.alt} 
              />
              {props.title && <div className='caption'>{props.title}</div>}
            </>
          ),
        }}
      >
        {remainingText}
      </ReactMarkdown>
    </div>
  )
}
