"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import "./Header.css";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link href="/" className="navbar-brand-link">
          <img src="/favicon.ico" alt="Home" className="logo" />
          <span className="brand-name">Lucas Hanson</span>
        </Link>
        <button
          className="burger-menu"
          onClick={toggleMenu}
          aria-label="Toggle menu"
          aria-expanded={isOpen}
          aria-controls="nav-links"
        >
          ☰
        </button>
      </div>

      <ul id="nav-links" className={`nav-links ${isOpen ? "open" : ""}`}>
        <li>
          <Link href="/" style={{ fontWeight: "bold" }}>
            <span role="img" aria-hidden="true">🌤</span> About me
          </Link>
        </li>
        <li>
          <Link href="/projects" style={{ fontWeight: "bold" }}>
            <span role="img" aria-hidden="true">👨‍💻</span> Projects
          </Link>
        </li>
        <li>
          <Link href="/blog" style={{ fontWeight: "bold" }}>
            <span role="img" aria-hidden="true">✍️</span> Blog
          </Link>
        </li>
        <li>
          <Link href="/aperture" style={{ fontWeight: "bold" }}>
            <span role="img" aria-hidden="true">📷</span> Aperture
          </Link>
        </li>
      </ul>
    </nav>
  );
}
