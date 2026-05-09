# Mail provider (AWS SES + EJS templates)

Sends transactional emails through AWS SES, with EJS-based template compilation supporting **partials**.

## Module

```typescript
imports: [MailProviderModule]
```

Wired automatically via `TMailProvider` token. Configuration comes from env: `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SES_FROM_EMAIL`.

## Inject

```typescript
constructor(private mailProvider: TMailProvider) {}
```

## Send a templated email

```typescript
const result = await this.mailProvider.sendTemplateEmail({
  to: 'jane@example.com',
  subject: 'Welcome!',
  templatePath: path.join(__dirname, '../templates/welcome.ejs'),
  templateData: {
    appName: 'Acme',
    userName: 'Jane',
    activationUrl: 'https://acme.test/activate/abc',
  },
});

if (result.error) return Result.fail(result.error);
```

## Send raw HTML

```typescript
await this.mailProvider.sendRawEmail({
  to: 'jane@example.com',
  subject: 'Hello',
  html: '<h1>Hi Jane</h1>',
});
```

## Just compile (preview)

```typescript
const compiled = await this.mailProvider.compileTemplate({
  templatePath: '...',
  templateData: { /* … */ },
});
const html = compiled.getValue()!;
```

---

## EJS templates with partials

Templates live as `.ejs` files. Partials are reusable fragments — typically `header.ejs` and `footer.ejs` — included in templates via `<%- include('partials/<name>') %>`.

### Layout convention

```
src/@shared/providers/mail-provider/templates/
├── partials/
│   ├── header.ejs
│   └── footer.ejs
├── welcome.ejs
└── password-reset.ejs
```

### Template referencing partials

```ejs
<%- include('partials/header') %>

<div style="padding: 24px;">
  <h2>Welcome, <%= userName %>!</h2>
  <p>Your account has been created successfully.</p>
</div>

<%- include('partials/footer') %>
```

### Partial — `partials/header.ejs`

```ejs
<!DOCTYPE html>
<html>
  <head><meta charset="utf-8" /></head>
  <body style="margin: 0; font-family: -apple-system, sans-serif;">
    <div style="background: #f5f5f5; padding: 20px;">
      <h1><%= appName %></h1>
    </div>
```

### Partial — `partials/footer.ejs`

```ejs
    <div style="background: #f5f5f5; padding: 16px; text-align: center;">
      <p>&copy; <%= new Date().getFullYear() %> <%= appName %></p>
    </div>
  </body>
</html>
```

### How partials are resolved

The provider passes the template's directory as the EJS `root` option. So `<%- include('partials/header') %>` resolves to `<template-dir>/partials/header.ejs`.

To override the resolution root (e.g. share partials across multiple template directories), pass `partialsDir`:

```typescript
await this.mailProvider.sendTemplateEmail({
  templatePath: '/abs/path/to/template.ejs',
  partialsDir: '/abs/path/to/shared-partials',
  /* … */
});
```

## EJS escaping cheat sheet

| Tag | Meaning |
|---|---|
| `<%= value %>` | escaped output (safe — HTML-encodes) |
| `<%- value %>` | unescaped output (raw HTML — used for `include`) |
| `<% if (x) { %> … <% } %>` | control flow |

Use `<%= %>` for user-supplied data. Use `<%- %>` only for trusted HTML or includes.

## Build assets (deployment)

The `nest-cli.json` `assets` config copies `**/templates/**/*.ejs` into `dist/` at build time so production runs find the templates next to the compiled JS. Verify your own build pipeline preserves this.
