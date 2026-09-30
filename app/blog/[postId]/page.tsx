import Image from "next/image";
import Link from "next/link";
import Markdown from "@/components/Markdown";
import BlogComments from "./BlogComments";
import { getBlogPosts, getBlogPost, SITE_URL } from "@/lib/content";
import { ArrowLeft } from "lucide-react";

export function generateStaticParams() {
  return getBlogPosts().map((post) => ({ postId: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const post = getBlogPost(postId);
  if (!post) return { title: "Post not found" };

  const ogImageUrl = `${SITE_URL}/api/og?title=${encodeURIComponent(
    post.title
  )}&subtitle=${encodeURIComponent("Lucas Hanson Blog")}`;

  return {
    title: post.title,
    description: post.description,
    keywords: post.keywords,
    alternates: { canonical: `${SITE_URL}/blog/${postId}` },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `${SITE_URL}/blog/${postId}`,
      images: [ogImageUrl],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: [ogImageUrl],
    },
  };
}

function formatDate(iso: string): string {
  if (!iso || iso === "1970-01-01") return "";
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function BlogPost({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const post = getBlogPost(postId);

  if (!post) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-40 text-center">
        <h1 className="font-hand text-4xl">Post not found</h1>
        <Link href="/blog" className="mt-6 inline-block text-muted-foreground hover:text-foreground">
          Back to blog
        </Link>
      </div>
    );
  }

  const date = formatDate(post.date);

  return (
    <>
      {/* Header */}
      <header className="relative px-6 pt-32 pb-10 sm:pt-40">
        <div className="mx-auto w-full max-w-3xl">
          <Link
            href="/blog"
            className="group mb-10 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1" />
            Blog
          </Link>
          {date && (
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {date}
            </p>
          )}
          <h1 className="font-hand text-4xl leading-[1.05] tracking-tight sm:text-6xl">
            {post.title}
          </h1>
          {post.image && (
            <div className="relative mt-10 aspect-[16/9] w-full overflow-hidden rounded-3xl border border-border">
              <Image
                src={post.image}
                alt={post.title}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-cover"
                style={{ filter: "grayscale(40%) brightness(0.8)" }}
              />
            </div>
          )}
        </div>
      </header>

      {/* Body */}
      <article className="mx-auto w-full max-w-3xl px-6 pb-16">
        <Markdown>{post.body}</Markdown>
      </article>

      {/* Comments */}
      <section className="mx-auto w-full max-w-3xl px-6 pb-24">
        <div className="hairline-top mb-10 w-full" />
        <h2 className="font-hand text-3xl">Comments</h2>
        <div className="mt-6">
          <BlogComments postId={postId} />
        </div>
      </section>
    </>
  );
}
