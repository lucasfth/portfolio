import PageHero from "@/components/PageHero";
import PostRow from "@/components/PostRow";
import Reveal from "@/components/Reveal";
import { getBlogPosts, SITE_URL } from "@/lib/content";

export const metadata = {
  title: "Blog",
  description:
    "Thoughts, experiences and insights on software development, photography and life.",
  alternates: { canonical: `${SITE_URL}/blog` },
  openGraph: {
    title: "Blog",
    description:
      "Thoughts, experiences and insights on software development, photography and life.",
    url: `${SITE_URL}/blog`,
    images: [`${SITE_URL}/api/og?title=Blog&subtitle=Lucas%20Hanson`],
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog",
    description:
      "Thoughts, experiences and insights on software development, photography and life.",
    images: [`${SITE_URL}/api/og?title=Blog&subtitle=Lucas%20Hanson`],
  },
};

export default function Blog() {
  const posts = getBlogPosts();

  return (
    <>
      <PageHero
        eyebrow="Writing"
        title="Blog"
        description="Thoughts, experiences and insights on software development, photography and the odd thing in between."
      />
      <section className="mx-auto w-full max-w-4xl px-6 pb-24">
        <div>
          {posts.map((post, i) => (
            <Reveal key={post.slug} delay={i * 60}>
              <PostRow post={post} index={i} />
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
