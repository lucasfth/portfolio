import React from 'react';
import './Footer.css';

function Footer() {
  return (
    <>
      <footer className='common-container'>
        <div className='inner-container'>
          <h2>🔗 Socials</h2>
          {/* Social Links vertically spread out*/}
          <div className='social-links'>
            <a href='https://instagram.com/lucas_hanson_' target='_blank' rel='noreferrer'>
            🖼️ Instagram
            </a>
            <a href='https://www.youtube.com/@lucas_hanson?sub_confirmation=1' target='_blank' rel='noreferrer'>
            📽️ YouTube
            </a>
            <a href='mailto:contact@lucashanson.dk' target='_blank' rel='noreferrer'>
            📧 Email
            </a>
            <a href='https://www.linkedin.com/in/lucasfth' target='_blank' rel='noreferrer'>
            🪧 LinkedIn
            </a>
            <a href='https://github.com/lucasfth' target='_blank' rel='noreferrer'>
            💻 GitHub
            </a>
            <a href='https://linktr.ee/lucashanson' target='_blank' rel='noreferrer'>
            🌴 Linktree
            </a>
          </div>
        </div>
      </footer>
      <footer className='common-container'>
        <div className='inner-container'>
          <p>
            Built using React and hosted trough GitHub Pages<br/>
            © Lucas Hanson {new Date().getFullYear()}<br/>
            <a href='https://github.com/lucasfth/portfolio' target='_blank' rel='noreferrer'>GitHub repository</a>
          </p></div>
      </footer>
    </>
  );
}

export default Footer;
