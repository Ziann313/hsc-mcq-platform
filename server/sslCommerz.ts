import { ENV } from "./_core/env";

type CheckoutInput = { transactionId: string; amountBDT: string; customerName: string; customerEmail: string; callbackBaseUrl: string };

export function sslCommerzConfigured() {
  return Boolean(ENV.sslCommerzStoreId && ENV.sslCommerzStorePassword);
}

function config() {
  if (!sslCommerzConfigured()) throw new Error("SSLCommerz merchant credentials are not configured");
  const baseUrl = ENV.sslCommerzSandbox ? "https://sandbox.sslcommerz.com" : "https://securepay.sslcommerz.com";
  return { baseUrl, storeId: ENV.sslCommerzStoreId, storePassword: ENV.sslCommerzStorePassword };
}

export async function createSslCommerzCheckout(input: CheckoutInput) {
  const provider = config();
  const body = new URLSearchParams({
    store_id: provider.storeId,
    store_passwd: provider.storePassword,
    total_amount: input.amountBDT,
    currency: "BDT",
    tran_id: input.transactionId,
    success_url: `${input.callbackBaseUrl}/api/payments/sslcommerz/success`,
    fail_url: `${input.callbackBaseUrl}/api/payments/sslcommerz/fail`,
    cancel_url: `${input.callbackBaseUrl}/api/payments/sslcommerz/cancel`,
    ipn_url: `${input.callbackBaseUrl}/api/payments/sslcommerz/ipn`,
    cus_name: input.customerName || "MCQ GURU Student",
    cus_email: input.customerEmail || "student@mcqguru.app",
    cus_add1: "Bangladesh",
    cus_city: "Dhaka",
    cus_country: "Bangladesh",
    shipping_method: "NO",
    product_name: "MCQ GURU Premium",
    product_category: "education",
    product_profile: "non-physical-goods",
  });
  const response = await fetch(`${provider.baseUrl}/gwprocess/v4/api.php`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  const payload = await response.json() as { status?: string; GatewayPageURL?: string; failedreason?: string };
  if (!response.ok || payload.status !== "SUCCESS" || !payload.GatewayPageURL) throw new Error(payload.failedreason || "SSLCommerz could not create a checkout session");
  return { gatewayUrl: payload.GatewayPageURL };
}
