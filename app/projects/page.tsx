'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ImageHeader from '@/components/ImageHeader'
import TextSection from '@/components/TextSection'

export default function Projects() {
  const [markdown, setMarkdown] = useState('')
  const router = useRouter()
  
  useEffect(() => {
    fetch('/content/projects.md')
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok')
      }
      return response.text()
    })
    .then(text => {
      setMarkdown(text)
    })
    .catch(err => console.error('Error loading markdown:', err))
  }, [])

  const handleLinkClick = (e: React.MouseEvent) => {
    const target = (e.target as HTMLElement).closest('a')
    if (target && target.getAttribute('href')?.startsWith('/projects/')) {
      e.preventDefault()
      const path = target.getAttribute('href')
      if (path) router.push(path)
    }
  }
  
  return (
    <div onClick={handleLinkClick}>
      <ImageHeader markdown={markdown} />
      <TextSection markdown={markdown} />
    </div>
  )
}
