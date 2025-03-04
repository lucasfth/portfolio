import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ImageSection from './ImageSection';
import './Gallery.css';

function Gallery() {
  const { galleryId } = useParams();
  const [markdown, setMarkdown] = useState('');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [enlargedImage, setEnlargedImage] = useState(null);

  useEffect(() => {
    console.log(`Loading gallery for: ${galleryId}`);
    console.log("PUBLIC_URL:", process.env.PUBLIC_URL);

    const getAssetPath = (path) => {
      // For GitHub Pages deployment
      if (process.env.NODE_ENV === 'production') {
        return `/portfolio${path}`;
      }
      // For local development
      return path;
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
            console.log(`Not found at ${locations[index]}, trying next location`);
            return tryNextLocation(index + 1);
          }
          return response.text();
        });
    };
    
    tryNextLocation(0)
      .then(text => {
        console.log(`Successfully loaded markdown for ${galleryId}`);
        setMarkdown(text);
        fetchGalleryImages(galleryId);
      })
      .catch(err => {
        console.error('Error loading gallery:', err);
        setError(err.message);
        setLoading(false);
      });
    
    const fetchGalleryImages = (folderName) => {
      fetch(`${process.env.PUBLIC_URL}/images/${folderName}/manifest.json`)
        .then(response => {
          if (!response.ok) {
            console.log('No manifest found, using fallback method');
            return checkCommonImagePatterns(folderName);
          }
          return response.json();
        })
        .then(data => {
          if (data && data.images) {
            setImages(data.images.map(img => ({
              src: getAssetPath(`/images/${galleryId}/${img}`),
              alt: img.replace(/\.\w+$/, ''),
            })));
          }
          setLoading(false);
        })
        .catch(err => {
          console.log('Falling back to hardcoded image list');
          const galleryImageMap = {
            'snow': [
              'DSCF5090.JPG',
              'DSCF5101.JPG',
              'DSCF5108.JPG',
              'DSCF5119.JPG',
              'DSCF5124.JPG',
              'DSCF5190.JPG',
              'DSCF5197.JPG'
            ],
            'urban': [
              'DSCF1786.jpg',
              'DSCF1793.jpg',
              'DSCF1796.jpg',
              'DSCF2013.jpg',
              'DSCF2018.jpg',
              'DSCF2626.jpg',
              'DSCF2650.JPG',
              'DSCF3962.JPG',
              'DSCF4550.JPG',
              'DSCF4644.JPG'
            ],
            'uni': [
              'DSCF2760.JPG',
              'DSCF2887.JPG',
              'DSCF2918.JPG',
              'DSCF4623.JPG',
              'DSCF4625.JPG',
              'DSCF4628.JPG',
              'DSCF4630~2.JPG',
              'DSCF4631.JPG',
              'DSCF4647.JPG',
              'DSCF4693.JPG',
              'DSCF4701.JPG',
              'DSCF4729.JPG',
              'DSCF4755.JPG',
              'DSCF4774.JPG'
            ],
            'nature': [
              'DSCF2081.jpg',
              'DSCF2082.jpg',
              'DSCF2083.jpg',
              'DSCF2084.jpg'
            ]
          };
          
          const imageList = galleryImageMap[galleryId] || [];
          setImages(imageList.map(img => ({
            src: `/images/${galleryId}/${img}`,
            alt: img.replace(/\.\w+$/, '')
          })));
          
          setLoading(false);
        });
    };
    
    const checkCommonImagePatterns = (folderName) => {
      return Promise.resolve({ images: [] });
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
      <ImageSection markdown={markdown} />
      
      <div className='gallery-container'>
      {images.length > 0 ? (
        <div className='gallery-grid'>
          {images.map((image, index) => (
            <div key={index} className='gallery-item'>

              { console.log('Image path (absolute):', process.env.PUBLIC_URL + image.src) }
              { console.log('Image file name:', image.src.split('/').pop()) }
              <img
                src={process.env.PUBLIC_URL + image.src}
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
              src={process.env.PUBLIC_URL + enlargedImage.src}
              alt={enlargedImage.alt || 'Enlarged image'}
              className='enlarged-image'
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default Gallery;
