import { MetadataRoute } from "next";
import { getBlogPosts, getProjects, getGalleries, SITE_URL } from "@/lib/content";
import { getStaticPagePaths } from "@/lib/sitemap";

/**
 * Build-generated sitemap served by Next.js at /sitemap.xml.
 *
 * Discovers static App Router page files and expands the blog, project, and
 * gallery collections automatically. New public pages do not require a URL
 * list edit; API handlers, private folders, and dynamic route templates are
 * excluded from static page discovery.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getBlogPosts();
  const projects = getProjects();
  const galleries = getGalleries();

  const base: MetadataRoute.Sitemap = getStaticPagePaths().map((path) => ({
    url: path === "/" ? SITE_URL : `${SITE_URL}${path}`,
    changeFrequency: "weekly",
    priority: path === "/" ? 1.0 : 0.8,
  }));

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
