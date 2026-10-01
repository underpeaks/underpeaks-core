<!-- File: underpeaks-core/README.md -->

# Underpeaks Core

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![npm version](https://img.shields.io/npm/v/underpeaks-nxf.svg)](https://www.npmjs.com/package/underpeaks-nxf)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/underpeaks/underpeaks-core/pulls)
[![Discord](https://img.shields.io/badge/Discord-join-5865F2?logo=discord&logoColor=white)](https://discord.gg/fNjwWrFPG)

**Build your backend once. Compile the rest.**

Underpeaks is a self-hosted, developer-first headless CMS that compiles production-ready Flutter and Next.js applications from a single content model. Define your data once, and get a real backend, a content editor, a REST API, and — if you want it — a working mobile and web app, generated straight from it.

**Compiled, not AI-generated:** the same model always produces the same code.

> **Before you start:** Core is free and open source, but it needs a **free license key** from an Underpeaks account. Creating one takes about 30 seconds — you'll be asked for the key the first time you sign in to Core.
> **[Create a free account →](https://underpeaks.com/signup?utm_source=github&utm_medium=readme)**

![Underpeaks console dashboard](./main/public/images/assets/dash.png)

<!-- TODO: swap in a short GIF (model → nxf generate flutter → running app)
     once recorded, and add the YouTube install video link here. -->

---

## Why Underpeaks

If you've ever built the same app for web and mobile, you know the tax: two codebases, two sets of backend glue code, one data model you're keeping in sync by hand. Change a field, update it in both places, miss one, ship a bug.

Underpeaks makes that one action — change the model, regenerate both. It also handles the backend work that quietly eats your week: auth that holds across devices, file storage without leaked keys, rate limits, consistent data.

No website builder, no drag-and-drop page editor. You already know how to build a frontend — Underpeaks builds the backend.

---

## Underpeaks Core vs Underpeaks Studio

| | **Underpeaks Core** | **Underpeaks Studio** |
|---|---|---|
| Hosting | Self-hosted, your infrastructure | Hosted, managed for you |
| Cost | Free, forever, open source | Paid, tiered plans |
| Database | 5 adapters: Supabase, PostgreSQL, MySQL, MongoDB, Firebase | Supabase (managed) |
| Code generation | Full Flutter + Next.js | Full Flutter + Next.js |
| Team members | Unlimited | Scales with plan |
| Integrations | — | AI, email, SMS/OTP, payments, and more |
| Support | Community (Discord) | Discord + email → priority email → dedicated channel, by plan |

Not sure which one you need? Start with Core — you can always move to Studio later once you know your usage.

---

## 1. Get the Code

```bash
git clone https://github.com/underpeaks/underpeaks-core.git
cd underpeaks-core
npm install
```

---

## 2. Have Your Database Ready

Core supports five database backends — pick whichever you're most comfortable with:

- **Supabase**
- **PostgreSQL**
- **MySQL**
- **MongoDB**
- **Firebase**

You don't need to set up any environment variables by hand. The installer handles all of that for you — just have your chosen database's connection details ready (host, credentials, project URL/keys, etc., depending on which one you pick).

---

## 3. Run the App

```bash
npm run dev
```

Visit **[http://localhost:3000](http://localhost:3000)** in your browser. Since this is a fresh install, you'll be automatically directed to the installer.

---

## 4. Run the Installer

The installer walks you through everything:

1. **Choose your database type** — pick from the 5 options above
2. **Enter your connection details** — the installer writes your `.env` configuration for you
3. **Database connection test** — confirms Core can reach your database
4. **Table creation** — creates all required system tables
5. **Demo content (optional)** — seeds a working example project so you have something to explore right away
6. **Admin account creation** — set the email and password for your first Core user

Once the installer finishes, you'll be redirected to sign in.

---

## 5. First Sign-in + License Key

Sign in with the admin credentials you just created. The first time you sign in, Core asks for your **license key**:

1. [Create a free Underpeaks account](https://underpeaks.com/signup?utm_source=github&utm_medium=readme) (about 30 seconds)
2. Copy the license key from your dashboard
3. Paste it into Core

You'll then land in the **Console** — Core's admin dashboard.

---

## 6. Quick Tour

| Section | What it does |
|---|---|
| **Dashboard** | Overview stats and KPIs for your project |
| **Shared Models** | Define your data models — the schemas that power everything else |
| **Pages** | Build admin and client-facing pages using your models |
| **Menu** | Control what shows in your sidebar navigation |
| **Navigator** | Map out how pages connect and navigate to one another |
| **Theme** | Customise colours and branding |
| **Storage** | Upload and manage media files |
| **Users** | Manage who has access to your Core instance |
| **Settings** | Project name, license key, SMTP, API keys, and more |

---

## Generate a Flutter or Next.js App

Once you've defined a model and attached it to a page, install the CLI and generate:

```bash
npm install -g underpeaks-nxf
nxf login
nxf generate flutter   # or nextjs
```

`nxf login` opens your browser to connect the CLI to your account. After that, `generate` produces a real project you own — models, API client and auth flows included.

See the [docs](https://underpeaks.com/docs/getting-started/introduction?utm_source=github&utm_medium=readme) for the full code generation guide.

---

## Troubleshooting

- **Installer can't connect to the database:** double-check your connection details, and make sure the database is reachable from wherever you're running Core (cloud databases often need your IP allowed).
- **Something looks off after setup:** check that your `.env.local` values match your database exactly.
- **Stuck?** Ask in [Discord](https://discord.gg/fNjwWrFPG) or [open an issue](https://github.com/underpeaks/underpeaks-core/issues).

---

## Links

- 📖 [Documentation](https://underpeaks.com/docs/getting-started/introduction?utm_source=github&utm_medium=readme)
- 💬 [Discord](https://discord.gg/fNjwWrFPG)
- 🏠 [Underpeaks Studio](https://studio.underpeaks.com?utm_source=github&utm_medium=readme)
- 🌐 [underpeaks.com](https://underpeaks.com?utm_source=github&utm_medium=readme)

---

## Contributing

Issues and pull requests are welcome. If you're planning a larger change, please open an issue first to discuss it — this project is actively maintained by a single developer, so a heads-up saves everyone time.

**Questions or feedback?** Join the [Discord](https://discord.gg/fNjwWrFPG) or open an issue. Underpeaks is built and maintained by one person, so please be patient with response times.

---

## License

Underpeaks Core is licensed under the [Apache License 2.0](./LICENSE).