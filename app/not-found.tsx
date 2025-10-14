"use client";

import React from "react";

export default function NotFound() {
  return (
    <div
      className="common-container"
      style={{ marginTop: "100px", minHeight: "60vh" }}
    >
      <div className="inner-container">
        <h1>404 - Page Not Found</h1>
        <img
          src="/images/wet_lucas.png"
          alt="404"
          style={{
            width: "25vh",
            height: "auto",
            borderRadius: "8px",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          }}
        />
        <p>Sorry, the page you are looking for does not exist.</p>
        <button
          style={{
            backgroundColor: "transparent",
            border: "2px solid blue",
            borderRadius: "5px",
            padding: "10px 20px",
            fontSize: "16px",
            color: "blue",
            fontWeight: "bold",
            marginTop: "20px",
          }}
          onClick={() => (window.location.href = "/")}
        >
          Click here to return to the homepage
        </button>
        <p>
          Or you can stay here to read more about my personal hobbies and
          interests. These are the ones that I have either not mentioned on the
          main pages or simply just not elaborated on in detail.
        </p>
        <h2>🥊 Training</h2>
        <p>
          After many years of strength training I hit a plateau. This could of
          course had been solved by making a more structured program and use
          more time. But I also at the same time wished to learn something new.
          <br />
          So small two years into my bachelors I looked up martial arts close to
          me, as it also looked like a sport where people have a lot more
          respect for each other. I started looking into MMA, but found nothing
          close to me. After some searching I finally found a gym which offered
          Muay Thai classes. I thus took my first trial class and quickly fell
          in love with the sport.
          <br />
          It was nice to finally not just get challenged mentally from uni work,
          but also physically by the training. I have now been training Muay
          Thai since summer 2023, and I have not only found a sport I love, but
          also a community which is very welcoming and friendly. Even though it
          may sound weird, I think that due to the knowledge that the one you
          are sparring with can hurt you it makes you more careful, honest and
          thus more respectful.
          <br />
          So I definely recommend trying out martial arts if you are looking for
          a new sport. Most places do not just teach you how to fight, but also
          how teach you implicitly how to be a better person.
        </p>
        <h2>📷 Photography</h2>
        <p>
          Photography is something I have always been fascinated by. But I have
          never really understood how people could take images that were not
          just a snapshot of a moment, but they could instead tell a story or a
          feeling.
          <br />
          In late 2022 I bought my first camera, a Fujifilm X-E4. I have then
          since experimented with what I enjoy taking pictures of. The first
          images I took were quite boring, and I it did not feel like nothing
          was communicated trough them. But as I look back I already do see what
          I wanted to portray.
          <br />I have always felt like people might not understand me, and I
          have always been a bit of an outsider. Thus most my personal images
          display some kind of feeling of loneliness. Not that it is a bad
          thing, since it can also be peaceful, and you have time to reflect.
        </p>
      </div>
    </div>
  );
}
