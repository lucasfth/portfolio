import Markdown from "@/components/Markdown";
import PageHero from "@/components/PageHero";
import { information } from "@/lib/agent-content";
const page = information.privacy;
export const metadata = { title: page.title, description: page.description, alternates: { canonical: "https://lucashanson.dk/privacy" }, openGraph: { title: page.title, description: page.description, url: "https://lucashanson.dk/privacy", images: ["https://lucashanson.dk/api/og?title=" + encodeURIComponent(page.title)] }, twitter: { card: "summary_large_image", title: page.title, description: page.description, images: ["https://lucashanson.dk/api/og?title=" + encodeURIComponent(page.title)] } };
export default function Page() { return <><PageHero title={page.title} /><section className="mx-auto w-full max-w-3xl px-6 py-16"><Markdown>{page.body}</Markdown></section></>; }
