'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import TextSection from '@/components/TextSection'
import ImageHeader from '@/components/ImageHeader'

export default function ProjectDetail() {
  const params = useParams()
  const projectId = params.projectId as string
  const [markdown, setMarkdown] = useState('')

  useEffect(() => {
    fetch(`/content/projects/${projectId}.md`)
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
  }, [projectId])

  return (
    <>
      <ImageHeader markdown={markdown} />
      <TextSection markdown={markdown} />
    </>
  )
}
