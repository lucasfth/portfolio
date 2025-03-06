import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Header from './components/Header';
import ImageSection from './components/ImageSection';
import TextSection from './components/TextSection';
import Footer from './components/Footer';
import Projects from './Projects';
import Aperture from './Aperture';
import ProjectDetail from './components/ProjectDetail';
import './App.css';
import Gallery from './components/Gallery';
import Blog from './Blog';
import BlogPost from './components/BlogPost';

function App() {
  const [markdown, setMarkdown] = useState('');

  useEffect(() => {
    fetch(process.env.PUBLIC_URL + '/content/frontpage.md')
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
    <Router basename='/'>
      <div className='App'>
        <Header />
        <Routes>
          <Route exact path='/' element={
            <>
              <ImageSection markdown={markdown} />
              <TextSection markdown={markdown} />
            </>
          } />
          <Route path='/projects' element={<Projects />} />
          <Route path='/projects/:projectId' element={<ProjectDetail />} />
          <Route path='/aperture' element={<Aperture />} />
          <Route path='/aperture/:galleryId' element={<Gallery />} />
          <Route path='/blog' element={<Blog />} />
          <Route path='/blog/:postId' element={<BlogPost />} />
        </Routes>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
