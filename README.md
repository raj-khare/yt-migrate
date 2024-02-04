# yt-migrate
### Import all your YouTube subscriptions from one account to another

Open [yt-migrate](https://raj-khare.github.io/yt-migrate/) to use via default keys. However, quota may get exhausted to due API limits, so you can try again next day (only remaining subscriptions will get transferred) or use your own API keys by following the steps below. 

Please use the below steps as my keys have crossed limits.

**Steps:**

1. Create a new project on [Google Cloud](http://console.cloud.google.com) and enable YouTube Data API under API & Services.
   - Link: https://console.cloud.google.com/apis/library/youtube.googleapis.com
2. Under credentials tab, create a new API key.
   - Link: https://console.cloud.google.com/apis/credentials
3. Create an OAUTH consent screen.
   - Link: https://console.cloud.google.com/apis/credentials/consent
4. Also create an OAUTH client and add two entries to 'Authorized JavaScript origins': `http://localhost:8080` and `http://localhost`
    - Link: https://console.cloud.google.com/apis/credentials/oauthclient
5. Add Old account and new account (by email) as Test users
    - Link: https://console.cloud.google.com/apis/credentials/consent
5. Clone the repo and paste the generated Client id on `main.js` (Line 1).
6. Run `python -m http.server 8080` from the current directory.
7. Open `http://localhost:8080` in the browser.
