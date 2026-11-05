# DIY-autohallin suunnittelu – shared project planner

The project planner, hosted on Vercel. Everyone who opens the site sees the same
project; changes are saved to an Upstash Redis database.

- **Viewing:** anyone with the link.
- **Editing:** click the **🔒 View only** badge (top right) and enter the edit password.
  It is remembered on that device. Click the badge again to lock.
- Changes upload about a second after you stop typing; other people's changes
  appear within ~15 seconds.
- If two people edit at the same time, the second one to save is asked whether to
  keep their own version or load the other one — nothing is overwritten silently.
- Which tab you're on and zoom level are per person and not shared.

## Files

| Path | What it is |
| --- | --- |
| `public/index.html` | The planner app (with cloud sync added near the end of the main script) |
| `api/state.js` | `GET` returns the project, `PUT` saves it (needs the password, rejects stale versions) |
| `api/login.js` | Checks the edit password |

## Setup on Vercel

1. **Import**: Vercel → *Add New… → Project* → import this GitHub repo.
   Framework preset: *Other*. No build command needed. Deploy.
2. **Database**: in the Vercel project → *Storage* → *Create Database* → **Upstash for Redis**
   (free plan) → connect it to this project. This adds `KV_REST_API_URL` and
   `KV_REST_API_TOKEN` automatically.
3. **Password**: *Settings → Environment Variables* → add `EDIT_PASSWORD` = the password for your team.
4. **Redeploy** (*Deployments* → ⋯ → *Redeploy*) so the new variables take effect.
5. Open the site, click **🔒 View only**, enter the password. The first editor's
   save uploads the project that is built into the page.

To change the password later, edit `EDIT_PASSWORD` and redeploy; everyone has to
unlock again.

## Backups

The ⇩ button in the app still downloads a JSON backup, and ⇧ restores one (restoring
while unlocked uploads it to the cloud).
