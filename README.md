# Getting Started with Underpeaks Core

Underpeaks Core is the open-source, self-hosted engine behind Underpeaks. Define your data models once in the Core console, and generate Flutter and Next.js apps directly from them — no need to hand-wire the backend for every platform separately. Core also functions as a full headless CMS on its own: pages, menus, media, and users, all manageable through the same console.

This guide walks you through registering an account, setting up your database, running the installer, and taking your first look around.

---

## 1. Register an Account

Underpeaks Core needs a license key issued from Underpeaks Studio, even when you're running everything yourself.

1. Go to **[https://underpeaks-studio-beta.vercel.app/](https://underpeaks-studio-beta.vercel.app/)**
2. Sign up for a free account
3. Once logged in, generate a license key from your dashboard — you'll paste this into Core during setup

Keep this tab open; you'll need the key again shortly.

---

## 2. Get the Code

```bash
git clone https://github.com/underpeaks/underpeaks-core.git
cd underpeaks-core
npm install
```

---

## 3. Choose Your Database

Core supports five database backends — pick whichever you're most comfortable with:

- **Supabase**
- **PostgreSQL**
- **MySQL**
- **MongoDB**
- **Firebase**

You don't need to set up any environment variables by hand. The installer (next step) handles all of that for you — you'll just need your chosen database's connection details ready (host, credentials, project URL/keys, etc., depending on which one you pick).

---

## 4. Run the App

```bash
npm run dev
```

Visit **[http://localhost:3000](http://localhost:3000)** in your browser. Since this is a fresh install, you'll be automatically directed to the installer.

---

## 5. Run the Installer

The installer walks you through everything:

1. **Choose your database type** — pick from the 5 options above
2. **Enter your connection details** — the installer writes your `.env` configuration for you
3. **Database connection test** — confirms Core can reach your database
4. **Table creation** — creates all required system tables
5. **Demo content (optional)** — seeds a working example project so you have something to explore right away
6. **Admin account creation** — set the email and password for your first Core user
7. **License key** — paste the license key you generated in step 1

Once the installer finishes, you'll be redirected to sign in.

---

## 6. First Login

Sign in with the admin credentials you just created. You'll land in the **Console** — Core's admin dashboard.

---

## 7. Quick Tour

| Section | What it does |
|---|---|
| **Dashboard** | Overview stats and KPIs for your project |
| **Shared Models** | Define your data models — the schemas that power everything else |
| **Pages** | Build admin and client-facing pages using your models |
| **Menu** | Control what shows in your sidebar navigation |
| **Navigator** | Map out how pages connect and navigate to one another |
| **Theme** | Customize colors and branding |
| **Storage** | Upload and manage media files |
| **Users** | Manage who has access to your Core instance |
| **Settings** | Project name, license key, SMTP, API keys, and more |

---

## Next Steps

- Create your first model under **Shared Models**
- Build a page for it under **Pages**
- Explore the generated admin views instantly — no extra config required

If you run into issues, check that your `.env.local` values match your database exactly, and that the database itself is reachable from wherever you're running Core.

---

**Questions or feedback?** Reach out through your Underpeaks Studio dashboard or the project's GitHub issues page.