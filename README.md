# InkAbba website

Next.js 15 (App Router) site for InkAbba: service pages with the request form
on the page, a backend that stores each lead and emails it to the owner, and a
private owner area for working leads and sending quotes.

Next.js is pinned to 15 because AWS Amplify Hosting supports versions 12–15.

## Run it locally

Requires Node 22 (`nvm use`).

```bash
npm install
npm run dev
```

Leads and quotes go to the InkAbba Google Sheet when `.env.local` has
`INKABBA_SHEET_CONFIG` (see "Where leads and quotes are stored"). Without it,
everything is stored in `.data/db.json`. Every email, including the owner's
sign-in link, is printed in the terminal. Any email address can sign in to `/admin` locally. Photo
uploads need the S3 bucket, so locally the form reports the file could not be
attached and still sends the request.

## Where things live

| Path | What it is |
|---|---|
| `src/lib/site.ts` | Business facts: phone, hours, brands, and the owner-to-confirm `facts` |
| `src/content/services.ts` | Copy for the six service pages |
| `src/content/requests.ts` | Field definitions for the eight request forms |
| `src/lib/server/reviews.ts` | Google reviews for the home page |
| `src/components/RequestForm.tsx` | The form: details, review, confirmation |
| `src/app/api/requests/route.ts` | Validates, stores the lead, then emails it |
| `src/app/api/uploads/route.ts` | Issues a short-lived S3 upload form |
| `src/app/admin/` | Owner area: leads, quotes, quote builder |
| `src/app/(site)/quote/[ref]/` | The customer's private quote page |
| `src/lib/quote.ts` | Quote shape and totals, shared by builder, server and email |
| `src/lib/server/store.ts` | The only code that talks to storage; picks the sheet, DynamoDB or a local file |
| `src/lib/server/sheetStore.ts` | Leads and quotes in the Google Sheet: tab layouts and reading/writing rows |
| `scripts/sheet.mjs` | Google Sheets client used by the app, and a CLI for checking or fixing the sheet |
| `src/lib/server/auth.ts` | Passwordless owner sign-in |
| `infra/template.yaml` | S3 bucket, SES identity, IAM role, alarm, and a DynamoDB table for later |
| `amplify.yml` | Amplify build settings |

## Business facts

Set in `src/lib/site.ts`. Anything left `null` or empty shows nothing on the
site, so no page invents an answer.

Decided:

- `replyTime`: "within 2 minutes", always shown with "during business hours".
  Outside opening hours the confirmation says the request will be answered at
  opening instead.
- `supplyWarranty`: the 100% lifetime warranty from the current site.
- `walkIn`: `false`. Said once, on the contact and ordering pages only.
- No FAQs and no 3D filament. Labels and ribbons are a main path on the home page.

Still open:

- `serviceAreas`: the cities where on-site repair is offered.
- `diagnosticFee` and `repairWarranty`.
- `recyclingTerms`: what is accepted, any fee, any credit.
- `paymentTerms` and `returnsPolicy`.
- `certifications`: named technician credentials.
- The new local 909 number: change `site.phone` when it exists.
- Monday hours: the current site says "8:30 am – 3:30 am"; this site assumes pm.
- Real photos of the team, repairs and equipment (none are used yet).

## Reviews

The home page shows Google reviews when `GOOGLE_PLACES_API_KEY` and
`GOOGLE_PLACE_ID` are set. Google's Places API returns at most 5 reviews (the
ones it ranks most relevant) and does not allow saving them, so they are
fetched fresh and cached for an hour. Each one links back to Google Maps.

To show more than 5, either add hand-picked reviews to `facts.reviews` (with
the customer's permission) or apply to Google for Business Profile API access,
which lets the owner list every review.

## Owner area and quotes

`/admin` is private. The owner signs in by email: they enter their address,
get a link that works once for 15 minutes, and stay signed in on that device
for 30 days. There is no password. Only addresses in `OWNER_EMAILS` can sign
in; in production nobody can until it is set.

- **Leads** lists every request, newest first, with search and a status:
  new, contacted, quoted, won, lost.
- **Write a Quote** on a lead opens the builder with the customer filled in.
  **New Quote** starts a blank one for someone who called.
- **Send to Customer** emails the quote, with a copy to the owner, and a link
  to the customer's own quote page where they can approve it or print it.
- **Quotes** lists every quote and searches by number, customer, company or
  item: this is where to look when a customer calls about one.

A sent quote cannot be edited, so what the customer has always matches the
record. To change pricing, use "Copy to a new quote", which gets a new number.
Sending a quote marks the lead quoted; the customer approving it marks the
lead won and notifies the owner.

Tax is a rate the owner types per quote, applied to the items and not to
delivery. Nothing here takes payment.

## Getting a lead to the owner fast

Every request emails the owner, with the customer's file attached and
reply-to set to the customer. Two ways to make that instant:

- Free: on the owner's phone, mark the sender address as a VIP so these emails
  get their own alert sound.
- A few dollars a month: set `LEADS_NOTIFY_SMS` and each lead also sends a
  text. This needs a sending number registered in AWS End User Messaging
  (a toll-free number takes days to verify, so start early).

## Where leads and quotes are stored

For now they live in [the InkAbba Google Sheet](https://docs.google.com/spreadsheets/d/1Ec-xJRTPIjDIb8DfECYWK4fjAkYFrecV_ZRo-19tI5g/edit),
one row per record:

- **Leads**: every request from the site. **Status** can be changed in the
  sheet or in the owner area; both see the same value.
- **Quotes**: every quote, with its items, totals and the customer's link.
  Edit quotes in the owner area, not the sheet: the app keeps sent quotes
  unchanged and works out totals itself.
- **Owner notes** (both tabs) is yours. The app never reads or writes it, and
  you can add more columns of your own.
- **App data** is hidden. It holds sign-in records (hashes only) and the quote
  counter. Don't edit it.

The app finds columns by their header text, so columns can be moved or
resized; if one of its headers is renamed it adds the column back. All
values are written as plain text or numbers, never as formulas, so nothing a
customer types can run in the sheet.

Things to know:

- **Speed.** Each save is a few calls to Google: sending a request or a quote
  takes about 3 seconds, owner pages about half a second.
- **Google's limit.** 60 reads and 60 writes a minute per Google account,
  shared with anything else using the same sign-in. The app waits and retries
  when it hits the limit. Fine for one owner and a few leads an hour.
- **Two saves at once.** A sheet can't lock a row. The app re-checks every
  new row after writing it and retries, and quote numbers skip any number
  already in the Quotes tab, but very busy traffic could still trip it.
- **Moving on.** When the business outgrows the sheet, set `LEADS_TABLE` (the
  DynamoDB table in `infra/template.yaml`) and copy the rows across.

To read or fix the sheet by hand:

```bash
INKABBA_SHEET_CONFIG=~/.config/inkabba/sheet.json node scripts/sheet.mjs pull --tab Leads
```

Production needs the four `GOOGLE_*` values from `.env.example`. The refresh
token is from a Google sign-in and can open every sheet that account can
open, and `amplify.yml` copies it into the build's `.env.production`. Grant
it from a Google account that only has access to the InkAbba sheet rather
than a personal one.

## Deploying to AWS

1. **Backend.** Deploy `infra/template.yaml` as a CloudFormation stack in the
   region you will host in. Note the outputs. Leave `LEADS_TABLE` unset while
   leads and quotes are kept in the Google Sheet.
2. **Email.** Add the three DKIM CNAME records from the stack outputs at the
   DNS host for inkabba.com. Then request SES production access; until it is
   granted SES only delivers to verified addresses.
3. **Hosting.** Push this repository to a Git host and create an Amplify
   Hosting app from it. Amplify detects Next.js and uses `amplify.yml`.
4. **Role.** In Amplify, App settings > IAM roles, set the compute role to the
   stack's `ComputeRoleArn`.
5. **Environment variables.** In Amplify, set the variables listed in
   `.env.example` using the stack outputs, then redeploy. `OWNER_EMAILS`
   decides who can sign in. `SITE_URL` must be the address the site is
   served from, because every emailed link is built from it: use the Amplify
   address until the domain is switched, then change it to the real one.
6. **Firewall.** In Amplify, enable the firewall (AWS WAF) with a rate-limit
   rule. The forms also use a hidden honeypot field.
7. **Alarm.** Update the stack with `AmplifyAppId` and `AlarmEmail` to be
   emailed when the site returns server errors.
8. **Domain.** Add inkabba.com in Amplify and point DNS at it. Do this last:
   it replaces the current GoDaddy site.

## How a request is handled

1. The browser validates the form and shows a review step.
2. If a file was chosen, the browser uploads it straight to S3 using a
   short-lived form from `/api/uploads`. S3 enforces type and an 8 MB limit.
3. `/api/requests` validates again, then saves the lead (to the Google Sheet,
   or DynamoDB once `LEADS_TABLE` is set).
4. Only after the lead is stored does it email the owner (with the file
   attached). If the email fails, the lead is still saved with "Owner
   emailed" set to no, and the error is logged.

The lead then appears in the owner area, where its status is tracked.
