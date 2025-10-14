import React from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { materialLight } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface TextSectionProps {
  markdown: string
}

export default function TextSection({ markdown }: TextSectionProps) {
  const lines = markdown.split('\n')
  const contentStart = lines.findIndex(line => line.startsWith('---'))
  const remainingText = contentStart !== -1 ? lines.slice(contentStart + 1).join('\n') : ''

  return (
    <div className="common-container">
      <div className="inner-container">
        <ReactMarkdown
          components={{
            code({ node, inline, className, children, ...props }: any) {
              const match = /language-(\w+)/.exec(className || '')
                return !inline && match ? (
                <SyntaxHighlighter
                  style={{ ...materialLight, 'pre[class*="language-"]': { ...materialLight['pre[class*="language-"]'], borderRadius: '8px' } }}
                  language={match[1]}
                  PreTag="div"
                  {...props}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
                ) : (
                <code className={className} {...props}>
                  {children}
                </code>
                )
            }
          }}
        >
          {remainingText}
        </ReactMarkdown>
      </div>
    </div>
  )
}
