import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import TextSection from './TextSection';
import ImageSection from './ImageSection';
import './BlogPost.css';

function BlogPost() {
  const { postId } = useParams();
  const [markdown, setMarkdown] = useState('');

  useEffect(() => {
    fetch(`${process.env.PUBLIC_URL}/content/blog/${postId}.md`)
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
  }, [postId]);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.setAttribute('data-repo', 'lucasfth/portfolio');
    script.setAttribute('data-repo-id', 'R_kgDON6IhoQ');
    script.setAttribute('data-category', 'General');
    script.setAttribute('data-category-id', 'DIC_kwDON6Ihoc4CnW__');
    script.setAttribute('data-mapping', 'url');
    script.setAttribute('data-strict', '1');
    script.setAttribute('data-reactions-enabled', '1');
    script.setAttribute('data-emit-metadata', '0');
    script.setAttribute('data-input-position', 'bottom');
    script.setAttribute('data-theme', 'light');
    script.setAttribute('data-lang', 'en');
    script.setAttribute('crossorigin', 'anonymous');
    script.async = true;

    const giscusContainer = document.getElementById('giscus-container');
    if (giscusContainer) {
      giscusContainer.appendChild(script);
    }

    return () => {
      if (giscusContainer) {
        giscusContainer.innerHTML = '';
      }
    };
  }, [postId]);

  return (
    <>
      <ImageSection markdown={markdown} />
      <TextSection markdown={markdown} />
      <div className="giscus-wrapper">
        <div id="giscus-container" />
      </div>
    </>
  );
}

export default BlogPost;
