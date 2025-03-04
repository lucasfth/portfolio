import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Header.css';

function Header() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <img 
          src={process.env.PUBLIC_URL + '/favicon.ico'} 
          alt="Logo" 
          className="logo"
        />
        <span className="brand-name">Lucas Hanson</span>
        <button className="burger-menu" onClick={toggleMenu}>
          ☰
        </button>
      </div>
      
      <ul className={`nav-links ${isOpen ? 'open' : ''}`}>
        <li><Link to="/" style={{fontWeight: "bold"}}>🌤 About me</Link></li>
        <li><Link to="/projects" style={{fontWeight: "bold"}}>👨‍💻 Projects</Link></li>
        <li><Link to="/blog" style={{fontWeight: "bold"}}>✍️ Blog</Link></li>
        <li><Link to="/aperture" style={{fontWeight: "bold"}}>📷 Aperture</Link></li>
      </ul>
    </nav>
  );
}

export default Header;
