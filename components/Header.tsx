"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import "./Header.css";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        navRef.current &&
        !navRef.current.contains(e.target as Node) &&
        isOpen
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

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
    <nav className="navbar" ref={navRef}>
      <Link
        href="/"
        className="navbar-brand"
        aria-current={isActive("/") ? "page" : undefined}
      >
        <img
          src="/favicon.ico"
          alt="Logo"
          className="logo"
          width={28}
          height={28}
        />
        <span className="brand-name">Lucas Hanson</span>
      </Link>

      <button
        className="burger-menu"
        onClick={toggleMenu}
        aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={isOpen}
        aria-controls="nav-menu"
      >
        <span aria-hidden="true">{isOpen ? "✕" : "☰"}</span>
      </button>

      <ul id="nav-menu" className={`nav-links ${isOpen ? "open" : ""}`}>
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
