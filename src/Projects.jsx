import React, { useState, useEffect } from 'react';
import TextSection from './components/TextSection';
import ImageHeader from './components/ImageHeader';
import { useNavigate } from 'react-router-dom';

function Projects() {
  const [markdown, setMarkdown] = useState('');
  const navigate = useNavigate();
  
  useEffect(() => {
    fetch(process.env.PUBLIC_URL + '/content/projects.md')
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

  const handleLinkClick = (e) => {
    const target = e.target.closest('a');
    if (target && target.getAttribute('href').startsWith('/projects/')) {
      e.preventDefault();
      const path = target.getAttribute('href');
      navigate(path);
    }
  };
  
  return (
    <div onClick={handleLinkClick}>
      <ImageHeader markdown={markdown} />
      <TextSection markdown={markdown} />
    </div>
  );
}

export default Projects;
