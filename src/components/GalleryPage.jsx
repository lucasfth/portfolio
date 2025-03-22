import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ImageHeader from './ImageHeader';
import './GalleryPage.css';
import TextSection from './TextSection';

function GalleryPage() {
  const { galleryId } = useParams();
  const [markdown, setMarkdown] = useState('');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [enlargedImage, setEnlargedImage] = useState(null);

  useEffect(() => {
    const getAssetPath = (path) => {
      if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
        return `${process.env.PUBLIC_URL}${path}`;
      }
      return path;
      
      // return `${process.env.PUBLIC_URL}${path}`;
    };
    
    const locations = [
      `/content/aperture/${galleryId}.md`,
      `/content/galleries/${galleryId}.md`,
      `/aperture/${galleryId}.md`,
    ];
    
    const tryNextLocation = (index) => {
      if (index >= locations.length) {
        throw new Error(`Failed to load markdown for gallery: ${galleryId}`);
      }
      
      return fetch(`${process.env.PUBLIC_URL}${locations[index]}`)
        .then(response => {
          if (!response.ok) {
            return tryNextLocation(index + 1);
          }
          return response.text();
        });
    };
    
    tryNextLocation(0)
      .then(text => {
        setMarkdown(text);
        fetchGalleryImages(galleryId);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
    
    const fetchGalleryImages = (folderName) => {
      fetch(`${process.env.PUBLIC_URL}/images/${folderName}/manifest.json`)
        .then(response => {
          if (!response.ok) {
            throw new Error('Manifest not found');
          }
          return response.json();
        })
        .then(data => {
          if (data && data.images) {
            setImages(data.images.map(img => ({
              src: getAssetPath(`/images/${galleryId}/${img}`),
              alt: img.replace(/\.\w+$/, '')
            })));
          } else {
            throw new Error('No images in manifest');
          }
          setLoading(false);
        })
        .catch(err => {
          const galleryImageMap = {
            'snow': [
              'DSCF5090.jpg',
              'DSCF5101.jpg',
              'DSCF5108.jpg',
              'DSCF5119.jpg',
              'DSCF5124.jpg',
              'DSCF5190.jpg',
              'DSCF5197.jpg'
            ],
            'urban': [
              'DSCF1786.jpg',
              'DSCF1793.jpg',
              'DSCF1796.jpg',
              'DSCF2013.jpg',
              'DSCF2018.jpg',
              'DSCF2626.jpg',
              'DSCF2650.jpg',
              'DSCF3962.jpg',
              'DSCF4550.jpg',
              'DSCF4644.jpg'
            ],
            'uni': [
              'DSCF2760.jpg',
              'DSCF2887.jpg',
              'DSCF2918.jpg',
              'DSCF4623.jpg',
              'DSCF4625.jpg',
              'DSCF4628.jpg',
              'DSCF4630~2.jpg',
              'DSCF4631.jpg',
              'DSCF4647.jpg',
              'DSCF4693.jpg',
              'DSCF4701.jpg',
              'DSCF4729.jpg',
              'DSCF4755.jpg',
              'DSCF4774.jpg'
            ],
            'nature': [
              'DSCF2081.jpg',
              'DSCF2082.jpg',
              'DSCF2083.jpg',
              'DSCF2084.jpg',
              'DSCF5236.jpg',
              'DSCF5240.jpg',
              'DSCF5251.jpg',
            ]
          };
      
          const imageList = galleryImageMap[galleryId] || [];
          
          setImages(imageList.map(img => ({
            src: getAssetPath(`/images/${galleryId}/${img}`),
            alt: img.replace(/\.\w+$/, '')
          })));
          
          setLoading(false);
        });
    };      

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setEnlargedImage(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
    
  }, [galleryId]);

  const handleImageClick = (image) => {
    setEnlargedImage(image);
  };

  const handleOverlayClick = () => {
    setEnlargedImage(null);
  };

  if (loading) {
    return <div className='loading'>Loading gallery...</div>;
  }

  if (error) {
    return <div className='error'>Error: {error}</div>;
  }

  return (
    <div>
      <ImageHeader markdown={markdown} />
      
      <div className='gallery-container'>
      {images.length > 0 ? (
        <div className='gallery-grid'>
          {images.map((image, index) => (
            <div key={index} className='gallery-item'>
              <img
                src={image.src}
                alt={image.alt || `Gallery image ${index + 1}`}
                className='gallery-image'
                onClick={() => handleImageClick(image)}
              />
            </div>
          ))}
    </div>
  ) : (
    <p>No images found in this gallery.</p>
  )}
</div>
      {enlargedImage && (
        <div className='overlay' onClick={handleOverlayClick}>
          <div className='overlay-content' onClick={(e) => e.stopPropagation()}>
            <img
              src={enlargedImage.src}
              alt={enlargedImage.alt || 'Enlarged image'}
              className='enlarged-image'
            />
          </div>
        </div>
      )}
      <TextSection markdown={markdown} />
    </div>
  );
}

export default GalleryPage;
