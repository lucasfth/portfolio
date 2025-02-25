import React, { useState, useEffect } from 'react';
import TextSection from './components/TextSection';
import ImageSection from './components/ImageSection';

function Projects() {
  const [markdown, setMarkdown] = useState('');

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

  return (
    <>
      <ImageSection markdown={markdown} />
      <TextSection markdown={markdown} />
    </>
  );
}

export default Projects;
