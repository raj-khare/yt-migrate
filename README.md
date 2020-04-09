### Steps

1. Create a new project on [Google Cloud](http://console.cloud.google.com) and enable YouTube Data API under API & Services.
2. Under credentials tab, create a new API key.
3. Also create an OAUTH client and set 'Authorized JavaScript origins' as `http://localhost:80`.
4. Clone the repo and paste the generated API key and Client id on `main.js` (Line 1 and 2).
5. Run `python -m http.server 80` from the current directory.
6. Open `http://localhost:80` in the browser.
