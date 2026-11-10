import "server-only";
import { randomBytes } from "crypto";

type PayPalToken = { access_token: string; expires_in: number };
let cached: { token: string; expiresAt: number } | null = null;

const base = () =>
  process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

async function accessToken(): Promise<string | null> {
  if (cached && cached.expiresAt > Date.now() + 60000) return cached.token;
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;

  if (!id || !secret) {
    return null; // Signals sandbox simulation mode
  }

  const auth = Buffer.from(`${id}:${secret}`).toString("base64");
  const res = await fetch(`${base()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials",
    cache: "no-store"
  });

  if (!res.ok) throw new Error(`PayPal token request failed (${res.status})`);
  const data = (await res.json()) as PayPalToken;
  cached = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

export async function createSandboxOrder(input: {
  amount: string;
  currency: string;
  paymentRequestId: string;
  description: string;
}) {
  if (process.env.PAYPAL_ENV === "live") {
    throw new Error("Live PayPal is strictly disabled in this MVP. Use Sandbox only.");
  }

  const token = await accessToken();
  if (!token) {
    // Simulated sandbox response when credentials are not yet entered
    return {
      id: `SANDBOX_ORDER_${randomBytes(8).toString("hex").toUpperCase()}`,
      status: "CREATED",
      simulated: true
    };
  }

  const res = await fetch(`${base()}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": input.paymentRequestId
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: input.paymentRequestId,
          custom_id: input.paymentRequestId,
          description: input.description,
          amount: { currency_code: input.currency, value: input.amount }
        }
      ]
    }),
    cache: "no-store"
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`PayPal create order failed (${res.status}): ${JSON.stringify(data)}`);
  return data;
}

export async function captureSandboxOrder(orderId: string) {
  if (process.env.PAYPAL_ENV === "live") {
    throw new Error("Live PayPal is disabled in this MVP. Use Sandbox.");
  }

  const token = await accessToken();
  if (!token || orderId.startsWith("SANDBOX_ORDER_")) {
    return {
      id: `CAPTURE_${randomBytes(8).toString("hex").toUpperCase()}`,
      status: "COMPLETED",
      simulated: true
    };
  }

  const res = await fetch(`${base()}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    cache: "no-store"
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`PayPal capture order failed (${res.status})`);
  return data;
}
