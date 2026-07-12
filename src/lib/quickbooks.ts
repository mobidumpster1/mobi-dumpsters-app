import { db } from "@/lib/db";

const CLIENT_ID = process.env.QUICKBOOKS_CLIENT_ID;
const CLIENT_SECRET = process.env.QUICKBOOKS_CLIENT_SECRET;
const REDIRECT_URI = process.env.QUICKBOOKS_REDIRECT_URI;
const CONFIGURED_ENVIRONMENT =
  process.env.QUICKBOOKS_ENVIRONMENT === "production" ? "production" : "sandbox";

const AUTHORIZE_URL = "https://appcenter.intuit.com/connect/oauth2";
const TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";

type QuickBooksConnection = {
  id: string;
  realmId: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  environment: string;
  defaultDepositAccountId: string | null;
  defaultDepositAccountName: string | null;
  defaultIncomeAccountId: string | null;
  defaultIncomeAccountName: string | null;
  defaultExpenseAccountId: string | null;
  defaultExpenseAccountName: string | null;
  defaultItemId: string | null;
};

export function isQuickBooksConfigured() {
  return Boolean(CLIENT_ID && CLIENT_SECRET && REDIRECT_URI);
}

export function getAuthorizationUrl(state: string) {
  if (!CLIENT_ID || !REDIRECT_URI) {
    throw new Error("QuickBooks is not configured (missing client ID or redirect URI)");
  }
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("client_id", CLIENT_ID);
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  // Accounting scope only — online invoice payment links use the standard
  // Invoice entity's AllowOnlineCreditCardPayment/invoiceLink fields, not
  // the separate Payments API, so we don't need that scope (which triggers
  // a much stricter Intuit compliance review for production access).
  url.searchParams.set("scope", "com.intuit.quickbooks.accounting");
  url.searchParams.set("state", state);
  return url.toString();
}

function basicAuthHeader() {
  return "Basic " + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
}

export async function exchangeCodeForTokens(code: string, realmId: string, organizationId: string) {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI ?? "",
    }),
  });

  if (!response.ok) {
    throw new Error(`QuickBooks token exchange failed: ${await response.text()}`);
  }

  const data = await response.json();

  // Only one QuickBooks company is supported per organization at a time;
  // replace any existing connection for this org with the new one.
  await db.quickBooksConnection.deleteMany({ where: { organizationId } });

  return db.quickBooksConnection.create({
    data: {
      organizationId,
      realmId,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      accessTokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
      environment: CONFIGURED_ENVIRONMENT,
    },
  });
}

async function refreshAccessToken(connection: QuickBooksConnection) {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: connection.refreshToken,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    // The refresh token itself is invalid/expired/revoked (e.g. invalid_grant)
    // — clear the stale connection so Settings falls back to prompting a
    // fresh "Connect to QuickBooks" instead of failing silently forever.
    await db.quickBooksConnection.delete({ where: { id: connection.id } }).catch(() => {});
    throw new Error(`QuickBooks connection expired — please reconnect in Settings. (${detail})`);
  }

  const data = await response.json();

  return db.quickBooksConnection.update({
    where: { id: connection.id },
    data: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      accessTokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
    },
  });
}

// Returns the current connection with a valid (non-expired) access token,
// refreshing it first if needed. Returns null if QuickBooks isn't connected
// yet — callers should treat that as "skip the sync", not an error.
export async function getValidConnection(organizationId: string): Promise<QuickBooksConnection | null> {
  const connection = await db.quickBooksConnection.findUnique({ where: { organizationId } });
  if (!connection) return null;

  const expiresInMs = connection.accessTokenExpiresAt.getTime() - Date.now();
  if (expiresInMs > 60_000) return connection;

  return refreshAccessToken(connection);
}

function apiBase(environment: string) {
  return environment === "production"
    ? "https://quickbooks.api.intuit.com"
    : "https://sandbox-quickbooks.api.intuit.com";
}

async function qboFetch(
  connection: QuickBooksConnection,
  path: string,
  options: RequestInit = {}
) {
  const url = `${apiBase(connection.environment)}/v3/company/${connection.realmId}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${connection.accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    // intuit_tid identifies this specific request to Intuit's support team —
    // logging it (along with the full response body) gives us everything
    // needed to troubleshoot without having to reproduce the failure.
    const intuitTid = response.headers.get("intuit_tid");
    const detail = await response.text();
    console.error(
      `QuickBooks API error (${response.status}) on ${path} [intuit_tid: ${intuitTid ?? "none"}]:`,
      detail
    );
    throw new Error(`QuickBooks API error (${response.status}, intuit_tid: ${intuitTid ?? "none"}): ${detail}`);
  }

  return response.json();
}

export type QboAccount = { Id: string; Name: string; AccountType: string };

export async function listAccounts(
  connection: QuickBooksConnection
): Promise<QboAccount[]> {
  const query = "SELECT Id, Name, AccountType FROM Account WHERE Active = true MAXRESULTS 1000";
  const data = await qboFetch(connection, `/query?query=${encodeURIComponent(query)}`);
  return data.QueryResponse?.Account ?? [];
}

export type QboCustomer = {
  Id: string;
  DisplayName: string;
  PrimaryEmailAddr?: { Address: string };
  PrimaryPhone?: { FreeFormNumber: string };
  BillAddr?: { Line1?: string; City?: string; CountrySubDivisionCode?: string; PostalCode?: string };
};

export async function listCustomers(
  connection: QuickBooksConnection
): Promise<QboCustomer[]> {
  const query = "SELECT Id, DisplayName, PrimaryEmailAddr, PrimaryPhone, BillAddr FROM Customer WHERE Active = true MAXRESULTS 1000";
  const data = await qboFetch(connection, `/query?query=${encodeURIComponent(query)}`);
  return data.QueryResponse?.Customer ?? [];
}

export type QboPurchase = {
  Id: string;
  TxnDate: string;
  TotalAmt: number;
  EntityRef?: { name?: string };
  Line?: Array<{
    Amount?: number;
    Description?: string;
    AccountBasedExpenseLineDetail?: { AccountRef?: { name?: string } };
  }>;
};

// Purchase is the entity QuickBooks Online's own "+ New > Expense" form
// creates (same entity pushExpensePurchase below writes to) — covers
// money already spent via cash/check/card, as opposed to an unpaid
// vendor Bill. `SELECT *` (not named columns) because QBO's query
// language doesn't reliably return the nested Line array otherwise.
export async function listPurchases(
  connection: QuickBooksConnection
): Promise<QboPurchase[]> {
  const query = "SELECT * FROM Purchase MAXRESULTS 1000";
  const data = await qboFetch(connection, `/query?query=${encodeURIComponent(query)}`);
  return data.QueryResponse?.Purchase ?? [];
}

async function findOrCreateQboCustomer(
  connection: QuickBooksConnection,
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    quickbooksCustomerId: string | null;
  }
): Promise<string> {
  if (customer.quickbooksCustomerId) return customer.quickbooksCustomerId;

  const escapedName = customer.name.replace(/'/g, "\\'");
  const searchData = await qboFetch(
    connection,
    `/query?query=${encodeURIComponent(`SELECT Id FROM Customer WHERE DisplayName = '${escapedName}'`)}`
  );
  const existing = searchData.QueryResponse?.Customer?.[0];
  if (existing) {
    await db.customer.update({
      where: { id: customer.id },
      data: { quickbooksCustomerId: existing.Id },
    });
    return existing.Id as string;
  }

  const created = await qboFetch(connection, "/customer", {
    method: "POST",
    body: JSON.stringify({
      DisplayName: customer.name,
      PrimaryEmailAddr: customer.email ? { Address: customer.email } : undefined,
      PrimaryPhone: customer.phone ? { FreeFormNumber: customer.phone } : undefined,
    }),
  });

  const qboId = created.Customer.Id as string;
  await db.customer.update({
    where: { id: customer.id },
    data: { quickbooksCustomerId: qboId },
  });
  return qboId;
}

async function ensureDefaultItem(connection: QuickBooksConnection): Promise<string> {
  if (connection.defaultItemId) return connection.defaultItemId;

  const searchData = await qboFetch(
    connection,
    `/query?query=${encodeURIComponent("SELECT Id FROM Item WHERE Name = 'Rental Services'")}`
  );
  const existing = searchData.QueryResponse?.Item?.[0];
  if (existing) {
    await db.quickBooksConnection.update({
      where: { id: connection.id },
      data: { defaultItemId: existing.Id },
    });
    return existing.Id as string;
  }

  if (!connection.defaultIncomeAccountId) {
    throw new Error(
      "Pick a default income account in Settings before pushing invoices to QuickBooks."
    );
  }

  const created = await qboFetch(connection, "/item", {
    method: "POST",
    body: JSON.stringify({
      Name: "Rental Services",
      Type: "Service",
      IncomeAccountRef: { value: connection.defaultIncomeAccountId },
    }),
  });

  const itemId = created.Item.Id as string;
  await db.quickBooksConnection.update({
    where: { id: connection.id },
    data: { defaultItemId: itemId },
  });
  return itemId;
}

type QboInvoiceInput = {
  invoiceNumber: string;
  amount: number;
  issueDate: Date;
  description: string;
  billEmail?: string;
  allowOnlinePayment?: boolean;
};

async function createQboInvoice(
  connection: QuickBooksConnection,
  qboCustomerId: string,
  itemId: string,
  input: QboInvoiceInput
): Promise<string> {
  const invoiceResponse = await qboFetch(connection, "/invoice", {
    method: "POST",
    body: JSON.stringify({
      DocNumber: input.invoiceNumber,
      TxnDate: input.issueDate.toISOString().slice(0, 10),
      CustomerRef: { value: qboCustomerId },
      ...(input.billEmail ? { BillEmail: { Address: input.billEmail } } : {}),
      ...(input.allowOnlinePayment
        ? { AllowOnlineCreditCardPayment: true, AllowOnlineACHPayment: true }
        : {}),
      Line: [
        {
          Amount: input.amount,
          DetailType: "SalesItemLineDetail",
          Description: input.description,
          SalesItemLineDetail: { ItemRef: { value: itemId } },
        },
      ],
    }),
  });
  return invoiceResponse.Invoice.Id as string;
}

// Creates (or reuses) a QuickBooks invoice with online payment enabled and
// returns Intuit's hosted "pay this invoice" link — the customer enters
// their card/bank details directly on Intuit's page, so no card data ever
// touches this app. Requires QuickBooks Payments to already be enabled on
// the connected company (a one-time setup Intuit's side, outside this app).
export async function createOnlinePaymentLink(input: {
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    quickbooksCustomerId: string | null;
  };
  invoiceNumber: string;
  amount: number;
  issueDate: Date;
  description: string;
  billEmail: string;
  existingQboInvoiceId?: string | null;
  organizationId: string;
}): Promise<{ qboInvoiceId: string; invoiceLink: string } | null> {
  const connection = await getValidConnection(input.organizationId);
  if (!connection) return null;

  const qboInvoiceId =
    input.existingQboInvoiceId ??
    (await (async () => {
      const [qboCustomerId, itemId] = await Promise.all([
        findOrCreateQboCustomer(connection, input.customer),
        ensureDefaultItem(connection),
      ]);
      return createQboInvoice(connection, qboCustomerId, itemId, {
        ...input,
        allowOnlinePayment: true,
      });
    })());

  const data = await qboFetch(connection, `/invoice/${qboInvoiceId}?include=invoiceLink`);
  return { qboInvoiceId, invoiceLink: data.Invoice.InvoiceLink as string };
}

// Returns the current balance on a QuickBooks invoice (0 once fully paid),
// or null if QuickBooks isn't connected.
export async function getQboInvoiceBalance(
  qboInvoiceId: string,
  organizationId: string
): Promise<number | null> {
  const connection = await getValidConnection(organizationId);
  if (!connection) return null;
  const data = await qboFetch(connection, `/invoice/${qboInvoiceId}`);
  return data.Invoice.Balance as number;
}

// Pushes a paid local invoice to QuickBooks as an Invoice + a linked Payment
// marking it paid in full. Returns the QBO IDs, or null if QuickBooks isn't
// connected (a booking/invoice should still work fine without this). Reuses
// an existing QBO invoice (e.g. one already sent for online payment)
// instead of creating a duplicate, when existingQboInvoiceId is given.
export async function pushInvoicePayment(input: {
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    quickbooksCustomerId: string | null;
  };
  invoiceNumber: string;
  amount: number;
  issueDate: Date;
  description: string;
  existingQboInvoiceId?: string | null;
  organizationId: string;
}): Promise<{ invoiceId: string; paymentId: string } | null> {
  const connection = await getValidConnection(input.organizationId);
  if (!connection) return null;
  if (!connection.defaultDepositAccountId) {
    throw new Error(
      "Pick a default deposit account in Settings before pushing payments to QuickBooks."
    );
  }

  const qboCustomerId = await findOrCreateQboCustomer(connection, input.customer);
  const qboInvoiceId =
    input.existingQboInvoiceId ??
    (await (async () => {
      const itemId = await ensureDefaultItem(connection);
      return createQboInvoice(connection, qboCustomerId, itemId, input);
    })());

  const paymentResponse = await qboFetch(connection, "/payment", {
    method: "POST",
    body: JSON.stringify({
      CustomerRef: { value: qboCustomerId },
      TotalAmt: input.amount,
      DepositToAccountRef: { value: connection.defaultDepositAccountId },
      Line: [
        {
          Amount: input.amount,
          LinkedTxn: [{ TxnId: qboInvoiceId, TxnType: "Invoice" }],
        },
      ],
    }),
  });
  const qboPaymentId = paymentResponse.Payment.Id as string;

  return { invoiceId: qboInvoiceId, paymentId: qboPaymentId };
}

// Pushes a paid expense to QuickBooks as a Purchase (money already spent).
// Returns the QBO purchase ID, or null if QuickBooks isn't connected.
export async function pushExpensePurchase(input: {
  vendor: string;
  category: string;
  amount: number;
  date: Date;
  organizationId: string;
}): Promise<string | null> {
  const connection = await getValidConnection(input.organizationId);
  if (!connection) return null;
  if (!connection.defaultDepositAccountId || !connection.defaultExpenseAccountId) {
    throw new Error(
      "Pick default deposit and expense accounts in Settings before pushing expenses to QuickBooks."
    );
  }

  const response = await qboFetch(connection, "/purchase", {
    method: "POST",
    body: JSON.stringify({
      TxnDate: input.date.toISOString().slice(0, 10),
      AccountRef: { value: connection.defaultDepositAccountId },
      PaymentType: "Cash",
      EntityRef: undefined,
      Line: [
        {
          Amount: input.amount,
          DetailType: "AccountBasedExpenseLineDetail",
          Description: `${input.vendor} — ${input.category}`,
          AccountBasedExpenseLineDetail: {
            AccountRef: { value: connection.defaultExpenseAccountId },
          },
        },
      ],
    }),
  });

  return response.Purchase.Id as string;
}
