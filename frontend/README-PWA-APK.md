AgriLink — Prepare PWA and Android APK

What I prepared:
- PWA manifest (`public/manifest.json`) and simple `public/sw.js` service worker
- `capacitor.config.json` ready for wrapping the web build into an Android app
- `package.json` script `build:pwa` to create a production build

High-level steps to produce an APK (local machine / Android Studio)

1) Install dependencies

```
cd frontend
npm install
npm install @capacitor/cli @capacitor/core --save-dev
```

2) Build the web app

```
npm run build:pwa
```

3) Initialize Capacitor (only the first time)

```
npx cap init
# Answer: App name: AgriLink, App id: com.agrilink.app (or keep as in capacitor.config.json)
```

4) Add Android platform

```
npx cap add android
```

5) Copy web assets to native project

```
npx cap copy android
```

6) Open Android project in Android Studio and build APK

```
npx cap open android
```

In Android Studio: Build > Generate Signed Bundle / APK. You will need a signing keystore. If you want CI to build it, add keystore file and secrets to GitHub Actions (see below).

Optional: Build from CLI (requires Android SDK and Gradle installed)

```
cd android
./gradlew assembleRelease
```

GitHub Actions template (high-level)
- Create a workflow that checks out code, runs `npm ci`, runs `npm run build:pwa`, installs Capacitor CLI, runs `npx cap add android` (if not present), runs `npx cap copy android`, then runs Gradle to build `assembleRelease`. Provide keystore and signing config via repository secrets. The workflow must run on Ubuntu runners with Android SDK set up.

Limits and notes
- I cannot publish the APK to Play Store from this environment.
- Building a signed APK requires a keystore and credentials (you control these). For CI automation, you'll need to add them as GitHub secrets and possibly upload the keystore as an encrypted secret and restore it during the workflow.
- If you want, I can add a GitHub Actions workflow file template and wire it up; you'll need to provide keystore and secrets.

Next options (pick one):
- I will add a GitHub Actions workflow template for building an unsigned APK artifact (you can sign it locally).
- I will add a GitHub Actions workflow that runs a signed build — you must provide keystore and secrets.
- I will stop here and guide you to run the local steps above.
