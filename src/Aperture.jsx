import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ImageSection from './components/ImageSection';
import ImageGallery from './components/ImageGallery';

function Aperture() {
  const [markdown, setMarkdown] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetch(process.env.PUBLIC_URL + '/content/aperture.md')
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.text();
      })
      .then(text => {
        setMarkdown(text);
      })
      .catch(err => console.error('Error loading markdown:', err));
  }, []);

  const handleImageClick = (galleryId) => {
    navigate(`/aperture/${galleryId}`);
  };

  return (
    <>
      <ImageSection markdown={markdown} />
      <ImageGallery markdown={markdown} onImageClick={handleImageClick} />
    </>
  );
}

export default Aperture;
