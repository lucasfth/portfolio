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

  const isActive = (path: string) => {
    if (path === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(path);
  };

  return (
    <nav className="navbar">
      <Link href="/" className="navbar-brand">
        <img src="/favicon.ico" alt="Logo" className="logo" />
        <span className="brand-name">Lucas Hanson</span>
      </Link>

      <button
        className="burger-menu"
        onClick={toggleMenu}
        aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={isOpen}
      >
        {isOpen ? "✕" : "☰"}
      </button>

      <ul className={`nav-links ${isOpen ? "open" : ""}`}>
        <li>
          <Link
            href="/"
            className={isActive("/") ? "active" : ""}
            aria-current={isActive("/") ? "page" : undefined}
          >
            <span aria-hidden="true">🌤</span> About me
          </Link>
        </li>
        <li>
          <Link
            href="/projects"
            className={isActive("/projects") ? "active" : ""}
            aria-current={isActive("/projects") ? "page" : undefined}
          >
            <span aria-hidden="true">👨‍💻</span> Projects
          </Link>
        </li>
        <li>
          <Link
            href="/blog"
            className={isActive("/blog") ? "active" : ""}
            aria-current={isActive("/blog") ? "page" : undefined}
          >
            <span aria-hidden="true">✍️</span> Blog
          </Link>
        </li>
        <li>
          <Link
            href="/aperture"
            className={isActive("/aperture") ? "active" : ""}
            aria-current={isActive("/aperture") ? "page" : undefined}
          >
            <span aria-hidden="true">📷</span> Aperture
          </Link>
        </li>
      </ul>
    </nav>
  );
}
