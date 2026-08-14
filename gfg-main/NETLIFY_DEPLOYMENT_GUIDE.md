# Netlify Deployment Guide for Peakconix

This guide covers the necessary configurations required to deploy the Peakconix frontend to Netlify while supporting client-side routing (React Router) and correctly proxying backend API requests to your Node.js/Cloud Run service.

## 1. `netlify.toml` Configuration

Create or update the `netlify.toml` file in the root of your project (where `package.json` is located). This file configures build commands, redirect rules, and rewrite rules for the proxy.

```toml
[build]
  # Build command (uses Vite)
  command = "npm run build"
  
  # The directory that Vite outputs the production build to
  publish = "dist"

[build.environment]
  # Specify the Node version matching your local environment
  NODE_VERSION = "20"

# ── API Proxy Redirect ────────────────────────────────────────────────────────
# Proxies all requests starting with /api/ to your backend server.
# This prevents CORS issues and keeps API keys secure on the backend.
[[redirects]]
  from = "/api/*"
  to = "https://your-backend-service-url.com/api/:splat"
  status = 200
  force = true

# ── Client-Side Routing Redirect ──────────────────────────────────────────────
# Important: This rule MUST be at the bottom.
# Redirects all other requests to index.html to allow React Router to handle the UI routing.
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## 2. Setting Up Environment Variables

In the Netlify dashboard for your site:

1. Go to **Site Configuration** > **Environment variables**.
2. Click **Add a variable** for each required key.

### Required Frontend Variables:
- `VITE_SUPABASE_URL`: Your Supabase project URL (if applicable).
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key (if applicable).
- *(Note: Do not put private API keys like `GEMINI_API_KEY` in Netlify if they are meant for the backend. Keep backend variables on your Node.js/Cloud Run server).*

## 3. The `_redirects` File (Optional Alternative)

If you prefer not to use `netlify.toml` for redirects, or if you need to generate dynamic redirects during the build process, you can create a `_redirects` file in your `public` directory.

The syntax for `public/_redirects`:

```text
# API Proxy
/api/*  https://your-backend-service-url.com/api/:splat  200!

# Fallback for React Router (SPA)
/*      /index.html   200
```

*Note: The `200!` tells Netlify to forcefully proxy the request. The trailing `200` for the SPA fallback means the browser will get `index.html` without changing the URL path.*

## 4. Troubleshooting Checklist

- **404 Errors on Page Reload**: Your SPA fallback (`/* /index.html 200`) is missing or is placed *above* other rules that match first.
- **CORS Errors**: Ensure your `/api/*` proxy rule in `netlify.toml` has `status = 200` and `force = true` (or `200!` in `_redirects`). Also, ensure the backend URL is correct.
- **Missing Environment Variables**: Prefix frontend variables with `VITE_` or they will not be bundled into the client code.
