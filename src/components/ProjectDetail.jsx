import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Header from './Header';
import TextSection from './TextSection';
import ImageSection from './ImageSection';

function ProjectDetail() {
  const { projectId } = useParams();
  const [markdown, setMarkdown] = useState('');

  useEffect(() => {
    fetch(`${process.env.PUBLIC_URL}/content/projects/${projectId}.md`)
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
  }, [projectId]);

  return (
    <>
      <ImageSection markdown={markdown} />
      <TextSection markdown={markdown} />
    </>
  );
}

export default ProjectDetail;
