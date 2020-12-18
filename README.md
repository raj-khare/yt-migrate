# yt-migrate
### Import all your YouTube subscriptions from one account to another

Open [yt-migrate](https://raj-khare.github.io/yt-migrate/) to use via default keys. However, quota may get exhausted to due API limits, so you can try again next day (only remaining subscriptions will get transferred) or use your own API keys by following the steps below.

**Steps:**

1. Create a new project on [Google Cloud](http://console.cloud.google.com) and enable YouTube Data API under API & Services.
2. Under credentials tab, create a new API key.
3. Create an OAUTH consent screen.
3. Also create an OAUTH client and set 'Authorized JavaScript origins' as `http://localhost:8080`.
4. Clone the repo and paste the generated API key and Client id on `main.js` (Line 1 and 2).
5. Run `python -m http.server 8080` from the current directory.
6. Open `http://localhost:8080` in the browser.
