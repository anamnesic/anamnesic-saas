import axios, { AxiosInstance } from "axios";

// ────────────────────────────────────────────────────────────
//  PagBank Subscriptions v4 client — ported from
//  pagbank-finance-backend/services/pagbank_subscriptions_service.js,
//  cleaned up (typed, single client instance, sandbox/prod switch).
//
//  Docs: https://dev.pagseguro.uol.com.br/reference (assinaturas v4)
// ────────────────────────────────────────────────────────────

const SANDBOX = "https://sandbox.api.pagseguro.com";
const PROD_SUBS = "https://api.assinaturas.pagseguro.com";
const PROD_PAY = "https://api.pagseguro.com";

export interface PagBankPlanInput {
  name: string;
  description?: string;
  amountBRL: number;          // e.g. 49.00  → converted to centavos
  intervalLength?: number;    // default 1
  trialDays?: number;
}

export interface PagBankPlan {
  id: string;
  name: string;
  amount: { value: number; currency: string };
  interval: { unit: string; length: number };
}

export interface PagBankCustomerInput {
  name: string;
  email: string;
  taxId: string;              // CPF 11 / CNPJ 14 digits
  phone?: { area: string; number: string };
}

function client(): AxiosInstance {
  const env = process.env.PAGBANK_ENV ?? "sandbox";
  const token = process.env.PAGBANK_TOKEN;
  if (!token || token.includes("your_pagbank_token")) {
    throw new Error("PAGBANK_TOKEN not configured (see .env.example)");
  }
  const baseURL = env === "production" ? PROD_SUBS : SANDBOX;
  return axios.create({
    baseURL,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "x-api-version": "4.0",
    },
    timeout: 30_000,
  });
}

export const pagbank = {
  /** Create a plan. amountBRL 49.00 → 4900 centavos. */
  async createPlan(input: PagBankPlanInput): Promise<PagBankPlan> {
    const { data } = await client().post("/plans", {
      reference_id: `plan_${Date.now()}`,
      name: input.name.slice(0, 100),
      description: input.description,
      amount: { value: Math.round(input.amountBRL * 100), currency: "BRL" },
      interval: { unit: "MONTH", length: input.intervalLength ?? 1 },
      payment_method: ["CREDIT_CARD", "BOLETO"],
      ...(input.trialDays
        ? { trial: { enabled: true, hold_setup_fee: false, days: input.trialDays } }
        : {}),
    });
    return data;
  },

  async listPlans(): Promise<PagBankPlan[]> {
    const { data } = await client().get("/plans");
    return data.plans ?? data;
  },

  async createSubscription(input: {
    planId: string;
    customer: PagBankCustomerInput;
    paymentMethod: { type: "CREDIT_CARD" | "BOLETO"; card?: PagBankCard };
    reference: string;
  }): Promise<any> {
    const body: Record<string, unknown> = {
      plan: { id: input.planId },
      reference_id: input.reference,
      customer: {
        name: input.customer.name,
        email: input.customer.email,
        tax_id: input.customer.taxId.replace(/\D/g, ""),
        ...(input.customer.phone
          ? { phones: [{ country: "55", area: input.customer.phone.area, number: input.customer.phone.number }] }
          : {}),
      },
      payment_method: input.paymentMethod,
    };
    const { data } = await client().post("/subscriptions", body);
    return data;
  },

  async getSubscription(id: string): Promise<any> {
    const { data } = await client().get(`/subscriptions/${id}`);
    return data;
  },

  async cancelSubscription(id: string): Promise<void> {
    await client().put(`/subscriptions/${id}/cancel`);
  },
};

export interface PagBankCard {
  number: string;
  expMonth: string;
  expYear: string;
  securityCode: string;
  holder: { name: string };
}
