```
npm install
npm run dev
```

```
open http://localhost:3000
```

## Pre-Arrival Quality Gate (Receiving Prep)

Midday step: generate Receiving Brief, risk-score orders, request supplier confirmations (MEDIUM/HIGH), and record deviations when suppliers confirm.

### Run the seed

From repo root (or `pkgs/server`):

```bash
npm run -w server seed:quality-gate
```

This seeds 2 suppliers (one with trust history, one new), 3 orders (including one high-risk perishable + tight window, one from the new supplier), and quality templates for berries/herbs/vegetables. The script prints the `restaurantId` and `date` to use for the API.

### Run the graph endpoint

1. Start the server: `npm run -w server dev`
2. Trigger the Quality Gate (use `restaurantId` and `date` from the seed output):

```bash
curl -X POST "http://localhost:3000/agent/quality-gate/run?restaurantId=YOUR_RESTAURANT_ID&date=YYYY-MM-DD"
```

Response: `{ receivingBriefId, confirmationsRequested, deviationFlags }`.

3. Get the Receiving Brief:

```bash
curl "http://localhost:3000/receiving-brief?restaurantId=YOUR_RESTAURANT_ID&date=YYYY-MM-DD"
```

4. Supplier confirmation (after a confirmation was requested for an order):

```bash
curl -X POST "http://localhost:3000/supplier/confirm" \
  -H "Content-Type: application/json" \
  -d '{"orderId":"ORDER_ID","supplierId":"SUPPLIER_ID","confirmQty":"10","packSize":"12/1lb","harvestDate":"2025-03-01","deliveryWindow":"14:00-16:00"}'
```

For HIGH risk, include `"photoUrl":"https://..."` in the body.

### Tests

- Unit test (risk scoring): `npm run -w server test` (runs `src/agents/qualityGate/riskScoring.test.ts`)
- Integration test (graph run on seeded orders): requires MongoDB; run `npx vitest run src/agents/qualityGate/graph.integration.test.ts` from `pkgs/server`

## Google Calendar integration

Opt-in “Connect Google Calendar” lets users add a calendar event for each delivery window when they place an order.

### Google Cloud OAuth setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create or select a project.
2. **APIs & Services → Library**: enable **Google Calendar API**.
3. **APIs & Services → OAuth consent screen**:
   - User type: **External** (for testing with any Google account).
   - Leave **Publishing status** as **Testing** (do not switch to Production until you complete Google’s verification).
   - Under **Test users**, click **Add users** and add the Gmail addresses that will connect Calendar (e.g. your own). Only these accounts can sign in while the app is in Testing.
   - If you see “Cultivate has not completed verification process”, the app is either in Production with unverified scopes, or you are not in the Test users list — add yourself as a test user and stay in Testing.
4. **APIs & Services → Credentials**: **Create credentials → OAuth client ID**.
   - Application type: **Web application**.
   - **Authorized redirect URIs**: add the **full** callback URL (must include path), e.g.  
     - Local: `http://localhost:3000/api/integrations/google/callback`  
     - Production: `https://your-api-domain.com/api/integrations/google/callback`  
   - Do not use `http://localhost:3000` alone; the path `/api/integrations/google/callback` is required.
5. Copy the **Client ID** and **Client secret**.

### Environment variables

Add to `pkgs/server/.env`:

```env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/integrations/google/callback
APP_BASE_URL=http://localhost:5173
INTEGRATIONS_TOKEN_KEY=<base64-encoded-32-bytes>
```

- **GOOGLE_REDIRECT_URI**: must match exactly one of the redirect URIs configured in the OAuth client.
- **APP_BASE_URL**: frontend origin; users are redirected here after OAuth with `?googleCalendar=connected`.
- **INTEGRATIONS_TOKEN_KEY**: generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` and store tokens encrypted at rest.
- **DEFAULT_DELIVERY_TIMEZONE** (optional): IANA timezone for interpreting delivery window times (e.g. `14:00` from the UI) as local time. Defaults to `America/New_York`. Set to your restaurant/timezone (e.g. `America/Los_Angeles`, `Europe/London`) so calendar events show 2pm–4pm in that zone.

### Where it appears

- **Connect Google Calendar**: **Settings** in the nav (route `/settings/integrations`). States: not connected (button), connecting (spinner), connected (“Connected to Google Calendar” + Disconnect + “Choose calendar” dropdown).
- Delivery events are created automatically when an authenticated user places an order (POST `/orders` with Bearer token); the order response may include `calendarEventCreated: true` or `calendarEventUpdated: true`.
