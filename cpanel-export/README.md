# Wordy World for cPanel

This is the whole KS1 English site packaged for ordinary shared hosting: static files
plus a small PHP API. Upload it, create a database, paste in your keys, and it runs
on `https://yourdomain.co.uk`.

## What is in the box

```
public_html/                 <- everything that goes into the web root
  index.html                 the app shell
  assets/                    the built JavaScript and CSS (fingerprinted filenames)
  wordy-world-android*.apk   the Android downloads offered by the QR panel
  qr-android.svg, qr-ios.svg the QR codes
  .htaccess                  Apache rules: /api routing, SPA fallback, caching
  api/index.php              the API (story coach + student accounts)
  ww-private/                NOT web accessible
    config.example.php       copy to config.php and fill in
    rate/                    spending-guard counters (created automatically)
sql/schema.sql               two MySQL tables
```

The site is the same React build that runs on `ks11.freebuff.page`. Nothing in the
browser changed: word lists, games, progress, speech and the story studio all live in
the page itself, so they work exactly as before.

## What is different from the Cloudflare version

| Cloudflare | Here |
| --- | --- |
| `worker.js` on Workers | `public_html/api/index.php` on PHP 8.1+ |
| D1 database (`DB`) | MySQL database, same two tables |
| `OPENAI` secret | `openai_key` in `ww-private/config.php` |
| PBKDF2-SHA256 password hashes | PHP `password_hash()` (bcrypt) |
| in-memory rate limits | small JSON counters in `ww-private/rate/` |

The API contract is identical, so `/api/story` and `/api/auth/*` answer with the same
JSON, status codes and cookie name.

## Requirements

- **PHP 8.1 or newer** (8.2/8.3 recommended) with `pdo_mysql`, `curl`, `mbstring` and
  `json`. All are on by default in cPanel's PHP builds; check under *MultiPHP Manager*.
- **MySQL 5.7+ or MariaDB 10.3+** — one database is enough.
- Apache with `mod_rewrite` and `AllowOverride All` (cPanel's default). If you use
  LiteSpeed, `.htaccess` rules are supported too.
- HTTPS strongly recommended (cPanel's free AutoSSL). The session cookie is marked
  `Secure` automatically when the request is HTTPS.

## Install

1. **Upload.** In cPanel → *File Manager*, open `public_html`, choose *Upload*, and
   upload `wordy-world-cpanel.zip`. Select it and press *Extract*. Delete the zip
   afterwards. (The site must be at the domain root, not a subfolder, because it uses
   absolute `/assets/...` paths.)
2. **Create the database.** cPanel → *MySQL Databases*: create a database, create a
   user, add the user to the database with *All Privileges*. Note the full names —
   cPanel prefixes them, e.g. `myaccount_wordy` and `myaccount_wordyuser`.
3. **Import the schema.** cPanel → *phpMyAdmin*, select your database, *Import*, choose
   `sql/schema.sql`, *Go*. You should end up with the tables `students` and `sessions`.
   (If you skip this, `api/index.php` creates the tables on first use.)
4. **Configure.** In `public_html/ww-private/`, copy `config.example.php` to
   `config.php` and fill in the database name, user, password and your OpenAI key.
   Open it with *Edit*; do not leave `config.example.php` with real values in it.
   Safer still: upload the same file as `/home/MYACCOUNT/wordy-config.php`, one level
   above `public_html`, and delete the copy inside the web root. The API looks there
   first.
5. **Permissions.** Directories `755`, files `644`. `ww-private/rate/` must be
   writable by PHP — on most cPanel setups that is the default owner, so no change is
   needed; if the story coach reports rate limiting never working, check
   *Errors* → `wordy-world` log.
6. **Force HTTPS** (recommended): cPanel → *Domains* → toggle *Force HTTPS Redirect*.

## Check it worked

Open these on your domain, in order:

- `/` — the home page loads with the owl and the word worlds.
- `/api/story` — should answer `{"ok":true,"configured":true,"model":"gpt-4o-mini"}`.
  `configured:false` means the OpenAI key is missing; the site still works and shows
  the offline story tips.
- Create a test badge on the sign-in page (name + password). Reload: you should still
  be signed in. Then check *phpMyAdmin* → `students` has one row.
- Tap a word in a world: the pop-up opens, *Listen* speaks (browser voices — on
  iPhone/Safari and Android Chrome only; the Android app uses its own TTS bridge),
  and *Record* asks for the microphone.
- Download the APK from the QR panel and confirm it is the versioned file
  (`wordy-world-android-1.1.apk`, 291,199 bytes).

## Point the QR codes at your domain

The two QR images in `public_html/` were generated for the live Cloudflare site, so
they still open `ks11.freebuff.page`. Regenerate them once for your own address (any
machine with Node):

```bash
npx qrcode -t svg -o qr-android.svg "https://YOURDOMAIN.co.uk/wordy-world-android-1.1.apk"
npx qrcode -t svg -o qr-ios.svg    "https://YOURDOMAIN.co.uk/"
```

Keep the filenames — the page loads `/qr-android.svg` and `/qr-ios.svg`.

One other site-specific string: if student sign-in is switched off (no working
`config.php` yet), the sign-in page says "It works on the live website:
ks11.freebuff.page". With a database configured that message never appears.

## Day-to-day notes

- **Updating the site:** rebuild with `npm run build`, then upload the new
  `index.html` and the new `assets/` folder. Keep `api/`, `ww-private/` and
  `.htaccess` untouched. Old fingerprinted assets can be deleted once the new build is
  live.
- **Changing the Android download:** replace the `.apk` files in `public_html/` and,
  if the version number changed, update `public_html/qr-android.svg` with the new
  target. Keep `wordy-world-android.apk` as the stable alias.
- **Rotating the OpenAI key:** edit `ww-private/config.php`. No restart needed.
- **Costs:** each coach call costs one small OpenAI request. The guards allow 12
  requests per 10 minutes and 40 per day per visitor, plus 400 per day across the
  whole site. Adjust the `const` values at the top of `api/index.php` if you want
  different numbers.
- **Backups:** the database holds the only server-side data (accounts). Back it up
  with cPanel → *Backup Wizard*.

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| Blank page, `/` returns 403 or a directory listing | `.htaccess` did not upload (hidden files are skipped by some FTP clients) or `AllowOverride` is off. |
| `/api/story` returns the HTML page | `mod_rewrite` is off, or the `.htaccess` rewrite rules were not applied. Ask your host to enable it. |
| `/api/*` returns 500 | PHP older than 8.1, or `pdo_mysql` missing. Set the domain's PHP version in *MultiPHP Manager*. |
| Sign-in says "not switched on" | `config.php` not found or database details wrong. Check the `wordy-world` error log. |
| "name-taken" for a brand-new name | The `name_key` column is unique and case-insensitive; pick a different name, e.g. add a number. |
| Story coach always offline | Key missing, or outbound HTTPS blocked by the host, or the OpenAI account has no credit. |
| Signed out on every visit | The site is being served over both http and https, so the `Secure` cookie is dropped. Force HTTPS. |
| APK downloads as a `.zip`/unknown file | `.htaccess` `AddType` line needs `mod_mime`. Re-download from the original file, or ask the host to add the MIME type. |

## Security notes

- `ww-private/` ships with `Require all denied`, and the root `.htaccess` blocks it a
  second time. Verify by visiting `/ww-private/config.php` — it must be 403, never the
  file contents.
- Never commit `config.php` or paste the OpenAI key into the browser code.
- Accounts are for UK primary-age children: passwords are hashed, session tokens are
  stored only as SHA-256 hashes, cookies are `HttpOnly` + `SameSite=Lax`, and the API
  rejects cross-origin POSTs.
