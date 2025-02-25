import React from 'react';
import './Footer.css';

function Footer() {
  return (
    <footer className="common-container">
      <div className="inner-container">
        <h2>🔗 Socials</h2>
        {/* Social Links vertically spread out*/}
        <div className="social-links">
          <a href="https://instagram.com/lucas_hanson_" target="_blank" rel="noreferrer">
          🖼️ Instagram
          </a>
          <a href="https://www.youtube.com/@lucashanson7590" target="_blank" rel="noreferrer">
          📽️ YouTube
          </a>
          <a href="mailto:contact@lucashanson.dk" target="_blank" rel="noreferrer">
          📧 Email
          </a>
          <a href="https://www.linkedin.com/in/lucas-frey-torres-hanson-b6b79320b/" target="_blank" rel="noreferrer">
          🪧 LinkedIn
          </a>
          <a href="https://github.com/lucasfth" target="_blank" rel="noreferrer">
          💻 GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
