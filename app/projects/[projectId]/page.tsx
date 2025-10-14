import ProjectDetailClient from './ProjectDetailClient'
import { readFileSync } from 'fs'
import { join } from 'path'

export function generateStaticParams() {
  return [
    { projectId: 'bachelor' },
    { projectId: 'dhi' },
    { projectId: 'judge-it' },
    { projectId: 'repolicense' },
  ]
}

export default async function ProjectDetail({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  try {
    const markdownPath = join(process.cwd(), 'public', 'content', 'projects', `${projectId}.md`)
    const markdown = readFileSync(markdownPath, 'utf8')
    
    return <ProjectDetailClient markdown={markdown} />
  } catch (err) {
    console.error('Error loading markdown:', err)
    return <ProjectDetailClient markdown="" />
  }
}
