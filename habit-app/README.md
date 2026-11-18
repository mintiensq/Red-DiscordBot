# Reset 66 — 66-day habit challenge

A small iPhone-friendly web app: pick 1–5 habits, check them off every day for 66 days,
and watch your progress across three phases (Break → Build → Become).

- Today screen: day counter ring, streak, best streak, completion %
- Journey screen: 66-day grid (tap any past day to backfill or add a note), per-habit stats
- Settings: edit habits, change the start date, export/import a backup, restart
- Works offline, with no account and no server. Data stays on the phone (localStorage).

It's plain HTML/CSS/JS with no build step.

## Put it on your iPhone (no Apple Developer account needed)

1. Host the `habit-app/` folder on any HTTPS site. Two easy options:
   - **GitHub Pages:** the workflow `.github/workflows/habit-app-pages.yml` deploys on every push to
     this branch. One-time setup: repo **Settings → Pages → Source: GitHub Actions**. Then under
     **Settings → Environments → github-pages**, allow the branch `claude/nifty-davinci-82xnbe`.
     (Pages on a private repo needs a paid GitHub plan.)
   - **Netlify Drop:** drag the `habit-app` folder onto https://app.netlify.com/drop.
2. Open the URL in **Safari** on the iPhone.
3. Tap **Share → Add to Home Screen**.

It now opens full-screen from its own icon, like a native app.

> Tip: export a backup now and then (Settings → Export). If you delete the home-screen app,
> iOS deletes its data too.

## Run locally

```bash
cd habit-app && python3 -m http.server 8000
```

Open http://localhost:8000.

## Want a real native app / TestFlight later?

TestFlight needs an Apple Developer account ($99/yr) and a build signed on macOS
(or a macOS GitHub Actions runner). This web app can be wrapped with
[Capacitor](https://capacitorjs.com) (`npx cap add ios`) without rewriting it.
That also unlocks local push reminders.
