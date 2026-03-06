# Customizing the Auth0 Login Page

Auth0's Universal Login is hosted by Auth0. To match the Cultivate design, customize it in the **Auth0 Dashboard**.

## Your Design Tokens (match these in Auth0)

| Element | Value | Hex |
|--------|-------|-----|
| Primary button | zinc-900 | `#18181b` |
| Primary hover | zinc-800 | `#27272a` |
| Background | white | `#ffffff` |
| Border | zinc-200 | `#e4e4e7` |
| Text | zinc-900 | `#18181b` |
| Muted text | zinc-500 | `#71717a` |
| Font | Inter | — |

---

## Option 1: Quick Theme (Recommended First Step)

1. Go to [Auth0 Dashboard](https://manage.auth0.com) → **Branding** → **Universal Login**
2. Under **Theme**, set:
   - **Primary Color**: `#18181b`
   - **Background Color**: `#ffffff`
   - **Page Background**: `#ffffff`
3. Under **Universal Login** → **Advanced Options**, upload a logo if you have one
4. Save

---

## Option 2: New Universal Login (Visual Theme Editor)

If your tenant uses **New Universal Login**:

1. Go to **Branding** → **Universal Login** → **Experience**
2. If "New Universal Login" is enabled, use the **Theme** tab
3. Set:
   - Primary: `#18181b`
   - Background: `#ffffff`
   - Font: Inter (or add via Custom CSS)
4. Optionally add custom CSS (see below)

---

## Option 3: Custom Login Page (Full Control)

For **Classic Universal Login** with full control:

1. Go to **Branding** → **Universal Login** → **Advanced Options**
2. Toggle **Customize Login Page** ON
3. Replace the default template with the contents of `auth0-login-template.html` (in this folder)

**Note:** Auth0 may inject config differently (e.g. `@@config@@`). If the template fails to load, copy the `<style>` block and `.cultivate-brand` HTML from the template into your existing Auth0 default template instead of replacing it entirely.
4. Save

---

## Custom CSS (for New or Classic with custom page)

Add this in Auth0’s Custom CSS field to align with the Cultivate design:

```css
/* Cultivate design alignment */
body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background-color: #ffffff !important;
  color: #18181b;
}

/* Primary button */
.auth0-lock-submit,
.auth0-lock .auth0-lock-submit,
[data-action="submit"] {
  background-color: #18181b !important;
  background: #18181b !important;
  border-color: #18181b !important;
  color: #ffffff !important;
  font-weight: 500;
  border-radius: 0.5rem;
}

.auth0-lock-submit:hover,
.auth0-lock .auth0-lock-submit:hover,
[data-action="submit"]:hover {
  background-color: #27272a !important;
  background: #27272a !important;
}

/* Inputs */
.auth0-lock-input,
input[type="email"],
input[type="password"],
input[type="text"] {
  border-color: #e4e4e7 !important;
  border-radius: 0.5rem;
  color: #18181b;
}

/* Header/title */
.auth0-lock-header,
.auth0-lock-name {
  color: #18181b !important;
  font-weight: 600;
}

/* Links */
.auth0-lock a {
  color: #18181b !important;
}

.auth0-lock a:hover {
  color: #27272a !important;
}
```

---

## Loading Inter Font

Add to the `<head>` of your custom login page or in Auth0’s Customize Login HTML:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
```

---

## Checklist

- [ ] Set primary color to `#18181b` (zinc-900)
- [ ] Set background to `#ffffff`
- [ ] Add Inter font if using custom page
- [ ] (Optional) Upload Cultivate logo
- [ ] Test login flow after saving
