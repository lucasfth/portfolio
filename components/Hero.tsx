import Image from "next/image";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

interface HeroProps { name: string; tagline: string; heroImage?: string }

export default function Hero({ name, tagline, heroImage }: HeroProps) {
  return (
    <section className="portfolio-hero">
      <div className="hero-copy">
        <p className="hero-location">Copenhagen, Denmark <span>Software / Photography</span></p>
        <h1>{name}</h1>
        <p data-terminal-heading className="hero-intro">{tagline}</p>
        <div className="hero-actions">
          <Link href="#projects">Explore the work <ArrowDownRight size={18} /></Link>
          <Link href="/about">About me <ArrowUpRight size={17} /></Link>
        </div>
        <div className="hero-footnote"><span>Code, images and things in between.</span><Link href="/blog">Field notes <ArrowUpRight size={14} /></Link></div>
      </div>
      {heroImage && <div className="hero-frame" data-terminal-media><Image src={heroImage} alt="" fill priority sizes="(min-width: 900px) 45vw, 100vw" className="object-cover" /><div className="hero-image-label" data-ascii="skip"><span>A different perspective.</span><Link href="/aperture">Aperture <ArrowUpRight size={14} /></Link></div></div>}
    </section>
  );
}
