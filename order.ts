import { orderPrice, orderCommit, getOrderStatus } from "./api.js";

interface OrderConfig {
  token: string;
  restaurantId: string;
  paymentAccountId: string;
  fireOrderInMinutes: number;
}

interface OrderResult {
  success: boolean;
  orderId?: string;
  error?: string;
}

async function waitForPriceSet(
  token: string,
  orderId: string,
  maxAttempts = 10,
  intervalMs = 1500,
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    const status = await getOrderStatus(token, orderId);
    console.log(`⏳ Order status: ${status}`);
    if (status === "PRICE_SUCCESSFUL") return;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("Timed out waiting for PRICE_SUCCESSFUL");
}

export async function placeUsualOrder(
  config: OrderConfig,
): Promise<OrderResult> {
  try {
    console.log("📋 Step 1: Pricing order...");
    const orderId = await orderPrice(
      config.token,
      config.restaurantId,
      config.paymentAccountId,
    );
    console.log(`✅ Order priced. ID: ${orderId}`);

    console.log("⏳ Step 2: Waiting for price confirmation...");
    await waitForPriceSet(config.token, orderId);
    console.log("✅ Price confirmed.");

    // ← ADD THIS BLOCK HERE
    if (process.env.DRY_RUN === "true") {
      console.log("🧪 DRY RUN — skipping OrderCommit");
      return { success: true, orderId: "dry-run-fake-id" };
    }

    console.log("🚀 Step 3: Committing order...");

    const committedId = await orderCommit(
      config.token,
      orderId,
      config.restaurantId,
      config.paymentAccountId,
      config.fireOrderInMinutes,
    );
    console.log(`✅ Order committed. ID: ${committedId}`);

    return { success: true, orderId: committedId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("❌ Order failed:", message);
    return { success: false, error: message };
  }
}
