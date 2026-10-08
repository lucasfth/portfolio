import { type SearchItem } from "./search";
import { getBlogPosts, getGalleries, getProjects } from "./content";

const EXTERNAL_SEARCH_ITEMS: SearchItem[] = [
  { title: "GitHub", href: "https://links.lucashanson.dk/gh", external: true },
  { title: "Instagram", href: "https://links.lucashanson.dk/ig", external: true },
  { title: "YouTube", href: "https://links.lucashanson.dk/yt", external: true },
  { title: "LinkedIn", href: "https://links.lucashanson.dk/li", external: true },
  { title: "Email Lucas", href: "mailto:contact@lucashanson.dk", external: true },
  { title: "All links", href: "https://links.lucashanson.dk", external: true },
];

export function getSearchItems(): SearchItem[] {
  return [
    { title: "About Lucas", href: "/", description: "Software engineer and photographer" },
    { title: "Projects", href: "/projects", description: "Software projects" },
    { title: "Blog", href: "/blog", description: "Writing and notes" },
    { title: "Aperture", href: "/aperture", description: "Photography" },
    { title: "Bitcoin donations", href: "/bitcoin", description: "Support this work" },
    ...getProjects().map((project) => ({
      title: project.title,
      href: `/projects/${project.slug}`,
      description: project.description,
      searchText: [project.tagline, project.keywords?.join(" "), project.tags?.join(" "), project.body].filter(Boolean).join(" "),
    })),
    ...getBlogPosts().map((post) => ({
      title: post.title,
      href: `/blog/${post.slug}`,
      description: post.description,
      searchText: [post.keywords?.join(" "), post.body].filter(Boolean).join(" "),
    })),
    ...getGalleries().map((gallery) => ({
      title: `${gallery.title} photography`,
      href: `/aperture/${gallery.id}`,
      description: gallery.description,
    })),
    ...EXTERNAL_SEARCH_ITEMS,
  ];
}

