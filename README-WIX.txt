WIX / ONLINE HOSTING SETUP - TIKTOK LIVE DEMO

THIS IS A DEMO. NO REAL ROBUX IS SENT. Keep the demo disclaimer visible; do not present it as sending actual Robux.

WHAT THIS DOES
This package runs the entire preview and TikTok connection on an online Node.js web service. You embed the HTTPS website in Wix. Your own computer does NOT need to run a terminal once the service is deployed, but you do need to keep the Wix page open during automation. The app only acts inside that open browser page; it does not run your on-screen automation when the page is closed.

YOU NEED
- Your Wix site.
- A GitHub account (https://github.com/) for the files.
- A Render account (https://render.com/) to run the online web service.
- A TikTok account that is currently LIVE when connecting. No TikTok password is required.

STEP 1 - UPLOAD THE FILES TO GITHUB
1. Extract this ZIP on your computer.
2. On GitHub, create a new repository. A private repo is fine if you grant Render access. Do not upload passwords or API keys.
3. In the new repository, use Add file > Upload files. Upload the CONTENTS of the extracted folder (index.html, server.mjs, events.mjs, package.json, package-lock.json, render.yaml, and this readme) into the repository root. Do not place them inside an extra parent folder.
4. Commit the upload.

STEP 2 - DEPLOY ON RENDER
1. In Render, create a New Web Service and connect the GitHub repository. Choose Node as the runtime.
2. Choose an instance plan. Render's free plan may sleep during inactivity and require time to wake. Higher availability may require a paid plan; check Render's current terms.
3. Build Command: npm ci --omit=dev
4. Start Command: npm start
5. Add the environment variable NODE_VERSION with value 22.16.0. Do NOT manually set PORT; Render supplies it.
6. Create the service and wait for deployment. Render will give you an HTTPS address ending in onrender.com. Open the address and verify the demo loads before proceeding. A render.yaml is also included if you prefer Render Blueprints.

STEP 3 - EMBED IN WIX
1. In the Wix Editor, open the page where you want the demo.
2. Choose Add Elements > Embed Code / Embed & Social > Embed a Site (the exact menu wording differs in Wix Studio).
3. Enter the full HTTPS address from Render. Resize the element to be wide and tall enough for the preview, then publish the Wix site.
4. Open the published Wix page, open Send Robux settings, connect your LIVE, and turn automation on. Keep this page open.

TROUBLESHOOTING AND IMPORTANT LIMITATIONS
- This service is publicly accessible to anyone with its URL, even if your GitHub repository is private. The original preview's client-side access screen is NOT real security. The service includes basic connection limits, not a login or protection against all abuse. Public use may consume hosting resources; do not put passwords or private credentials in the app.
- The 15-turn cooldown uses the browser's demo transaction history. If the browser blocks storage inside Wix, the app keeps that history in memory for the current page, but it resets on reload. The settings will display a warning in that case. Try the direct Render URL if your Wix embedding or browser blocks necessary APIs.
- The app must stay open for comments to be handled. Render sleeping, re-deploys, network interruptions, or third-party TikTok restrictions can interrupt the connection; the app attempts to reconnect.
- The TikTok library is unofficial and relies on third-party signing. TikTok or the service may block or change it. Gift processing has only been tested using simulated events.
- A comment must consist of a Roblox username (optionally beginning with @). Gift senders must comment their username after the gift. Rose simulates 5,000; other supported gift values and the 15-turn cooldown remain in the app.
- The existing third-party Roblox search service must also be reachable. The service can become unavailable independently of this app.
- The "Test with Roblox (no chat)" button tests only the on-screen simulation, not actual TikTok chat or gifts.
