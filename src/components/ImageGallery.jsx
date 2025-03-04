import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './ImageGallery.css';

function ImageGallery({ markdown, onImageClick }) {
  const lines = markdown.split('\n');
  const contentStart = lines.findIndex(line => line.startsWith('---'));
  const remainingText = contentStart !== -1 ? lines.slice(contentStart + 1).join('\n') : '';

  const handleImageContainerClick = (href) => {
    if (onImageClick && href) {
      const galleryId = href.split('/').pop();
      onImageClick(galleryId);
    }
  };

  return (
    <div className='image-gallery-container'>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ node, ...props }) => {
            const hasImage = node.children.some(child => child.tagName === 'img');
            if (hasImage) {
              return <div className='image-wrapper'>{props.children}</div>;
            }
            return <div className='text-wrapper'><p {...props} /></div>; // Wrap text in text-wrapper
          },
          a: ({ node, ...props }) => (
            <div 
              className='image-container' 
              onClick={() => handleImageContainerClick(props.href)}
              >
              <a 
                {...props} 
                className='image-link' 
                onClick={(e) => {
                  e.preventDefault();
                }}
              >
                {props.children}
              </a>
            </div>
          ),
          img: ({ node, ...props }) => (
            <>
              <img 
                {...props} 
                src={process.env.PUBLIC_URL + props.src} 
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
  );
}

export default ImageGallery;
