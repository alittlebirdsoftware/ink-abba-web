# InkAbba website

Next.js 15 (App Router) site for InkAbba: service pages, request forms, and a
small backend that stores each lead and emails it to the owner.

Next.js is pinned to 15 because AWS Amplify Hosting supports versions 12–15.

## Run it locally

Requires Node 22 (`nvm use`).

```bash
npm install
npm run dev
```

With no environment variables set, submitted requests are appended to
`.data/leads.jsonl` and the owner email is printed in the terminal. Photo
uploads need the S3 bucket, so locally the form reports the file could not be
attached and still sends the request.

## Where things live

| Path | What it is |
|---|---|
| `src/lib/site.ts` | Business facts: phone, hours, brands, and the owner-to-confirm `facts` |
| `src/content/services.ts` | Copy for the six service pages |
| `src/content/requests.ts` | Field definitions for the eight request forms |
| `src/components/RequestForm.tsx` | The form: details, review, confirmation |
| `src/app/api/requests/route.ts` | Validates, stores the lead, then emails it |
| `src/app/api/uploads/route.ts` | Issues a short-lived S3 upload form |
| `infra/template.yaml` | DynamoDB table, S3 bucket, SES identity, IAM role, alarm |
| `amplify.yml` | Amplify build settings |

## Facts the owner still has to confirm

Each of these is `null` or empty in `src/lib/site.ts`, and the site shows
nothing for it until it is filled in. No page invents an answer.

- `replyTime`: how quickly requests are answered. Shown on every form.
- `serviceAreas`: the cities where on-site repair is offered.
- `diagnosticFee` and `repairWarranty`.
- `supplyWarranty`: the current site's banner says "100% lifetime warranty".
- `recyclingTerms`: what is accepted, any fee, any credit.
- `paymentTerms` and `returnsPolicy`.
- `certifications`: named technician credentials.
- `reviews`: only with the customer's permission.
- `walkIn`: set to `false` (no storefront or pickup). Confirm this is right.
- Monday hours: the current site says "8:30 am – 3:30 am"; this site assumes pm.
- Real photos of the team, repairs and equipment (none are used yet).

## Deploying to AWS

1. **Backend.** Deploy `infra/template.yaml` as a CloudFormation stack in the
   region you will host in. Note the outputs.
2. **Email.** Add the three DKIM CNAME records from the stack outputs at the
   DNS host for inkabba.com. Then request SES production access; until it is
   granted SES only delivers to verified addresses.
3. **Hosting.** Push this repository to a Git host and create an Amplify
   Hosting app from it. Amplify detects Next.js and uses `amplify.yml`.
4. **Role.** In Amplify, App settings > IAM roles, set the compute role to the
   stack's `ComputeRoleArn`.
5. **Environment variables.** In Amplify, set the variables listed in
   `.env.example` using the stack outputs, then redeploy.
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
3. `/api/requests` validates again, then writes the lead to DynamoDB.
4. Only after the lead is stored does it email the owner (with the file
   attached). If the email fails, the lead is still in the table with
   `notified: false` and the error is logged.

Leads have a `status` field (`new`) so they can be tracked through
contacted, qualified and won. There is no admin screen yet.
