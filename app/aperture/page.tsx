import PageHero from "@/components/PageHero";
import GalleryTile from "@/components/GalleryTile";
import Reveal from "@/components/Reveal";
import { getGalleries, SITE_URL } from "@/lib/content";

export const metadata = {
  title: "Aperture",
  description:
    "A selection of photography — moody, minimalistic and textured.",
  alternates: { canonical: `${SITE_URL}/aperture` },
  openGraph: {
    title: "Aperture",
    description: "A selection of photography — moody, minimalistic and textured.",
    url: `${SITE_URL}/aperture`,
    images: [`${SITE_URL}/api/og?title=Aperture&subtitle=Lucas%20Hanson%20Photography`],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aperture",
    description: "A selection of photography — moody, minimalistic and textured.",
    images: [`${SITE_URL}/api/og?title=Aperture&subtitle=Lucas%20Hanson%20Photography`],
  },
};

export default function Aperture() {
  const galleries = getGalleries();

  return (
    <>
      <PageHero
        eyebrow="Photography"
        title="Aperture"
        description="Why Aperture? 'Portfolio' was taken, so I chose Aperture. Here is a selection of moments I have captured — I'm still finding my style, but I like moody, minimalistic, or something with texture like a painting."
      />
      <section className="mx-auto w-full max-w-6xl px-6 pb-24">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {galleries.map((g, i) => (
            <Reveal key={g.id} delay={i * 70}>
              <GalleryTile gallery={g} />
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
