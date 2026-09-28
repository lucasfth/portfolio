import React from "react";
import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 pt-40 pb-24">
      <div className="flex flex-col items-center text-center">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Error 404
        </p>
        <h1 className="mt-4 font-hand text-6xl tracking-tight sm:text-7xl">
          Page not found
        </h1>
      </div>

      <div className="relative mx-auto mt-12 aspect-[3/4] w-full max-w-[300px] overflow-hidden rounded-3xl border border-border">
        <Image
          src="/images/wet_lucas.png"
          alt="Lucas Hanson looking wet"
          fill
          priority
          sizes="(max-width: 768px) 100vw, 300px"
          className="object-cover"
          style={{ filter: "grayscale(60%) brightness(0.85)" }}
        />
      </div>

      <p className="mt-10 text-center text-base text-muted-foreground">
        Sorry, the page you are looking for does not exist.
      </p>

      <div className="mt-6 text-center">
        <Link
          href="/"
          className="group inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-accent-foreground transition-transform hover:-translate-y-0.5"
        >
          <span aria-hidden="true">←</span> Return to homepage
        </Link>
      </div>

      <div className="mt-16">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Or you can stay here to read more about my personal hobbies and
          interests. These are the ones that I have either not mentioned on the
          main pages or simply just not elaborated on in detail.
        </p>
      </div>

      <section className="mt-12">
        <h2 className="font-hand text-3xl">
          Training
        </h2>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            After many years of strength training I hit a plateau. This could of
            course have been solved by making a more structured program and use
            more time. But I also at the same time wished to learn something
            new. So small two years into my bachelors I looked up martial arts
            close to me, as it also looked like a sport where people have a lot
            more respect for each other. I started looking into MMA, but found
            nothing close to me. After some searching I finally found a gym
            which offered Muay Thai classes. I thus took my first trial class
            and quickly fell in love with the sport.
          </p>
          <p>
            It was nice to finally not just get challenged mentally from uni
            work, but also physically by the training. I have now been training
            Muay Thai since summer 2023, and I have not only found a sport I
            love, but also a community which is very welcoming and friendly.
            Even though it may sound weird, I think that due to the knowledge
            that the one you are sparring with can hurt you it makes you more
            careful, honest and thus more respectful.
          </p>
          <p>
            So I definitely recommend trying out martial arts if you are looking
            for a new sport. Most places do not just teach you how to fight, but
            also teach you implicitly how to be a better person.
          </p>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-hand text-3xl">
          Photography
        </h2>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            Photography is something I have always been fascinated by. But I
            have never really understood how people could take images that were
            not just a snapshot of a moment, but they could instead tell a story
            or a feeling. In late 2022 I bought my first camera, a Fujifilm
            X-E4. I have then since experimented with what I enjoy taking
            pictures of. The first images I took were quite boring, and it did
            not feel like nothing was communicated through them. But as I look
            back I already do see what I wanted to portray.
          </p>
          <p>
            I have always felt like people might not understand me, and I have
            always been a bit of an outsider. Thus most my personal images
            display some kind of feeling of loneliness. Not that it is a bad
            thing, since it can also be peaceful, and you have time to reflect.
          </p>
        </div>
      </section>
    </div>
  );
}
