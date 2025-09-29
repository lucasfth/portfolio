![header](/images/judge-it.png)

# Judge IT

Judge IT is a web app I built to help with judging and displaying results for [CampusCup](https://campuscup.dk), a yearly relay at the IT University of Copenhagen.

---

## ⚓ The event

On Friday, the 12th of September 2025, I had the opportunity to participate in organizing CampusCup at IT-Universitetet i København—a yearly relay race that drew, very quick guess, 700 spectators throughout the day. Teams of four went to compete against each other, sailing over Emil Holms Kanal, chugging a beer, spinning around, and then sailing back.

## 🚀 Launching Judge IT

This year was special for me because I spent a good amount of my free time over the past year building a web app from scratch called [Judge IT](https://github.com/itu-campuscup/judge-it). This was its first real-world test. No previous events. A QA team consisting of me. And mainly a dev team consisting of me. So, yeah, I was extremely nervous about what would happen when people actually started using it on the day.

💡 The idea behind Judge IT was simple:

1. Make it easier for the judges to identify winners, especially when finishes get close.
2. Make the whole thing more fun and engaging for both participants and spectators, with real-time stats and a little extra drama about who is the best at sailing.

🔥 So did it burn down on the day?

Fortunately not, and it went way better than I expected. The judges picked it up quickly, spectators loved seeing live updates, and the feedback was super positive (which was extremely surprising due to how little outside input I had during development). But the spectators and competitors also want to access the stats on their own devices. There are a few reasons I chose not to allow this, but I have proposed a new solution which would allow it. You can see the proposal [here](https://github.com/orgs/itu-campuscup/discussions/1).

But the best of all. Judge IT did not break during the event. That felt like a massive win for me.

📖 Of course, a few “learning moments” popped up:

- Sometimes, judges would accidentally double-click a button, which led to some wild and unrealistic times showing up. I ended up fixing these directly in the Supabase tables during the event. Next year, I will probably lock the buttons for a few seconds after they’re pressed.
- The judges’ network connection got spotty with so many people outside, and sometimes stats took a while to update. Lesson learned: next time, bring a dedicated router just for the judges.
- And a few other, luckily, minor bugs.

Some things you simply do not catch until real people are using your stuff in real life. I have learned a ton, and a lot of it has nothing to do with code.

## 👨‍💻 For the tech curious

If you want to geek out over the details, here’s how Judge IT works (and some of the headaches I wrestled with):

- First-ever public use:
  This was the app’s very first real-world outing. No dry runs, no beta testers. So if you saw me hovering nervously during the races, now you know why.
- Stack:
  - Frontend: Next.js (React-based, SSR + client)
  - Backend/DB: Supabase (PostgreSQL, REST API, and Realtime over websockets)
  - Language: Almost entirely TypeScript (96%+), sprinkled with a bit of CSS and JavaScript.
- Two main views:
  - Judge's view: Judges see a UI tailored to their station (contestant side/beer side)
  - Registering a time is just a button press. You just have to select the team, and the contestant side judge also has to select the specific participant.
  - The app logs the timestamp using Supabase’s server clock (not the phone’s), which sidesteps issues with device clock drift and network delays.
  - All time logs are simply “events”, no start/stop labels. This made it way easier to fix data after the fact (which, as it turns out, is pretty important when double-clicks happen).
  - Statistics view: Shows live stats for all teams: chugging, spinning, sailing times, and more.
  - You can compare any two teams or contestants directly.
  - See the current heat progression as it happens.
  - Stats update instantly thanks to Supabase Realtime—no refresh needed. (Unless the network is overloaded. Oops.)
- Some interesting challenges:
  - Matching start/stop times:
    Figuring out which button press was a “start” and which was a “stop” (without explicit labels) turned out to be a fun little puzzle, maybe closer to a headache when teams had to be compared.
    But it was definitely the correct choice for flexibility and error correction.
  - Network reliability:
    Supabase Realtime is great—until everyone’s phone is fighting for bandwidth. I will probably see if we can get a router specifically for the judges.
  - UI resilience:
    I now know judges can click faster than I can code. Button debounce/locking is high on the priority list.
- No custom backend/server:
  Everything runs serverless through Supabase, which made setup and scaling a breeze—especially since I didn’t want to run my own server for a one-day event.
- Open source:
  If you want to peek under the hood, suggest features, or use it for your own event, the code lives [here](https://github.com/itu-campuscup/judge-it).
- Future plans:
  - Button lockout to prevent double-clicks and accidental entries
  - Dedicated network for judges to avoid “laggy” stats
  - More functions for automatic error correction

I am really proud of how Judge IT held up for its first outing. There is plenty to improve, but that is half the fun. If you want to know more or geek out about real-time event scoring, feel free to reach out or check out the repo.
