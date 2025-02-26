import React from 'react';
import ReactMarkdown from 'react-markdown';

function ImageSection({ markdown }) {
  if (!markdown) {
    return <div>No content available</div>;
  }

  const lines = markdown.split('\n');
  const headerImage = lines.find(line => line.startsWith('![header]'));
  const profileImage = lines.find(line => line.includes('profile picture'));
  const firstHeading = lines.find(line => line.startsWith('# '));
  const firstParagraph = lines.find(line => !line.startsWith('![') && !line.startsWith('#') && line.trim() !== '');

  return (
    <div style={{ position: 'relative' }}>
      {/* Header Image with Darkening Filter */}
      <div style={{ 
        width: '100%',
        height: '70vh',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {headerImage && (
          <>
            <ReactMarkdown
              components={{
                img: ({...props}) => (
                  <img 
                    {...props} 
                    src={process.env.PUBLIC_URL + props.src}
                    alt={props.alt}
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      filter: 'brightness(50%) grayscale(100%)' // Darkening filter
                    }}
                  />
                )
              }}
            >
              {headerImage}
            </ReactMarkdown>
          </>
        )}

        {/* Content positioned over the background */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '100%',
          maxWidth: '1200px',
          padding: '0 20px',
          color: 'white',
          zIndex: 2
        }}>
          <div className="content-container">
            {profileImage && (
              <div className="profile-image-container">
                <ReactMarkdown
                  components={{
                    img: ({...props}) => (
                      <img 
                        {...props} 
                        src={process.env.PUBLIC_URL + props.src}
                        alt={props.alt || ''}
                        style={{
                          width: '100%',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                    )
                  }}
                >
                  {profileImage}
                </ReactMarkdown>
              </div>
            )}
            <div className="text-container">
              {firstHeading && (
                <div style={{ 
                  fontSize: '2rem', 
                  marginBottom: '1rem'
                }}>
                  <ReactMarkdown>{firstHeading}</ReactMarkdown>
                </div>
              )}
              {firstParagraph && (
                <div style={{ fontSize: '1.2rem' }}>
                  <ReactMarkdown>{firstParagraph}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ImageSection;
