import { MetadataRoute } from "next";
import { getBlogPosts, getProjects, getGalleries, SITE_URL } from "@/lib/content";

/**
 * Dynamic sitemap.
 *
 * Served by Next.js at /sitemap.xml. Replaces the previously hand-maintained
 * static `public/sitemap.xml`, whose lastmod dates were frozen and which had to
 * be edited by hand for every new post.
 *
 * Scans the content collection on each build, so any new blog post, project,
 * or gallery is picked up automatically. No extra step in the deploy pipeline.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getBlogPosts();
  const projects = getProjects();
  const galleries = getGalleries();

  const base: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
    { url: `${SITE_URL}/projects`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/aperture`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/blog`, changeFrequency: "weekly", priority: 0.8 },
  ];

  const projectUrls: MetadataRoute.Sitemap = projects.map((p) => ({
    url: `${SITE_URL}/projects/${p.slug}`,
    lastModified: p.date ? new Date(`${p.date}T00:00:00Z`) : new Date(),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const galleryUrls: MetadataRoute.Sitemap = galleries.map((g) => ({
    url: `${SITE_URL}/aperture/${g.id}`,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const blogUrls: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${SITE_URL}/blog/${p.slug}`,
    lastModified: p.date ? new Date(`${p.date}T00:00:00Z`) : new Date(),
    changeFrequency: "yearly",
    priority: 0.7,
  }));

  return [...base, ...projectUrls, ...galleryUrls, ...blogUrls];
}
