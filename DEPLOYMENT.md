# Bite Lab site deployment

Bite Lab is a static React/Vite site hosted on GitHub Pages. It does not use Firebase or provide account registration, sign-in, password reset, database, analytics, or email features.

## GitHub Pages

The GitHub Actions workflow in `.github/workflows/deploy-pages.yml` builds the app and deploys the `dist` folder whenever changes are pushed to `main`.

For the `kirst3nn/Bitalabtesting` repository:

- Published site: `https://kirst3nn.github.io/Bitalabtesting/`
- In GitHub, open **Settings → Pages** and select **GitHub Actions** as the deployment source.
- Once Pages is enabled, push commits to `main` or manually run **Actions → Deploy Bite Lab to GitHub Pages → Run workflow**.

To build and preview locally, install Node.js 22 or later and run:

```powershell
npm ci
npm run build
npm run preview
```

The workflow automatically uses the repository subpath for project sites and the root path for `*.github.io` user or organization sites. It does not need Firebase credentials or Actions variables.

`bitelab.infinityfreeapp.com` is not automatically routed to GitHub Pages. A custom hostname can only be connected if you control its DNS and configure the corresponding GitHub Pages custom domain.
