"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import "./Header.css";
import Image from "next/image";

function Header() {
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
        <Image src="/favicon.ico" alt="Logo" className="logo" width={28} height={28} />
        <span className="brand-name">Lucas Hanson</span>
        <button className="burger-menu" onClick={toggleMenu}>
          ☰
        </button>
      </div>

      <ul className={`nav-links ${isOpen ? "open" : ""}`}>
        <li>
          <Link href="/" style={{ fontWeight: "bold" }}>
            🌤 About me
          </Link>
        </li>
        <li>
          <Link href="/projects" style={{ fontWeight: "bold" }}>
            👨‍💻 Projects
          </Link>
        </li>
        <li>
          <Link href="/blog" style={{ fontWeight: "bold" }}>
            ✍️ Blog
          </Link>
        </li>
        <li>
          <Link href="/aperture" style={{ fontWeight: "bold" }}>
            📷 Aperture
          </Link>
        </li>
      </ul>
    </nav>
  );
}

export default Header;
