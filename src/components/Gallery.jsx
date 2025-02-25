import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
    
    // Try locations in order of preference
    const locations = [
      `/aperture/${galleryId}.md`,
      `/content/aperture/${galleryId}.md`,
      `/content/galleries/${galleryId}.md`
    ];
    
    // Try each location until one works
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
    
    // 1. Load markdown content
    tryNextLocation(0)
      .then(text => {
        console.log(`Successfully loaded markdown for ${galleryId}`);
        setMarkdown(text);
        // After markdown is loaded, try to fetch the image directory listing
        fetchGalleryImages(galleryId);
      })
      .catch(err => {
        console.error('Error loading gallery:', err);
        setError(err.message);
        setLoading(false);
      });
    
    // 2. Function to fetch all images from the gallery folder
    const fetchGalleryImages = (folderName) => {
      // This is where you'd normally fetch a directory listing
      // Since browsers can't list directories, we'll simulate it with a special JSON file
      
      // Try to fetch a manifest file that lists all images in the folder
      fetch(`${process.env.PUBLIC_URL}/images/${folderName}/manifest.json`)
        .then(response => {
          if (!response.ok) {
            console.log('No manifest found, using fallback method');
            // Fallback: use a predefined list of common image names to check
            return checkCommonImagePatterns(folderName);
          }
          return response.json();
        })
        .then(data => {
          if (data && data.images) {
            // Use images from manifest
            setImages(data.images.map(img => ({
              src: `/images/${folderName}/${img}`,
              alt: img.replace(/\.\w+$/, ''), // Remove file extension for alt text
            })));
          }
          setLoading(false);
        })
        .catch(err => {
          console.log('Falling back to hardcoded image list');
          // Fallback to hardcoded images for this specific gallery
          const galleryImageMap = {
            'snow': [
              'DSCF5090.JPG',
              'DSCF5101.JPG',
              'DSCF5107.JPG',
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
    
    // Helper function to check for common image filenames
    const checkCommonImagePatterns = (folderName) => {
      // This is a simulation since we can't list directories in the browser
      return Promise.resolve({ images: [] });
    };

    // Add event listener for escape key to close enlarged image
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setEnlargedImage(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup event listener on component unmount
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
    return <div className="loading">Loading gallery...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div>
      {/* Use ImageSection to display header image and intro text */}
      <ImageSection markdown={markdown} />
      
      {/* Gallery section showing all automatically loaded images */}
      <div className="gallery-container">
        {images.length > 0 ? (
          <div className="gallery-grid">
            {images.map((image, index) => (
              <div key={index} className="gallery-item" onClick={() => handleImageClick(image)}>
                <img
                  src={process.env.PUBLIC_URL + image.src}
                  alt={image.alt || `Gallery image ${index + 1}`}
                  className="gallery-image"
                />
              </div>
            ))}
          </div>
        ) : (
          <p>No images found in this gallery.</p>
        )}
      </div>

      {/* Enlarged image overlay */}
      {enlargedImage && (
        <div className="overlay" onClick={handleOverlayClick}>
          <div className="overlay-content" onClick={(e) => e.stopPropagation()}>
            <img
              src={process.env.PUBLIC_URL + enlargedImage.src}
              alt={enlargedImage.alt || 'Enlarged image'}
              className="enlarged-image"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default Gallery;
