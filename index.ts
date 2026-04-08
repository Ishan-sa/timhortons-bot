// src/index.ts
// Telegram bot entry point
import "dotenv/config";
import TelegramBot from "node-telegram-bot-api";
import { placeUsualOrder } from "./order.js";
import { initAuth, getIdToken } from "./auth.js";

// --- Config from env ---
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const ALLOWED_USER_ID = parseInt(process.env.ALLOWED_TELEGRAM_USER_ID!);
const TH_REFRESH_TOKEN = process.env.TH_REFRESH_TOKEN;
const TH_JWT_TOKEN = process.env.TH_JWT_TOKEN;
const TH_RESTAURANT_ID = process.env.TH_RESTAURANT_ID!;
const TH_PAYMENT_ACCOUNT_ID = process.env.TH_PAYMENT_ACCOUNT_ID!;
const TH_FIRE_IN_MINUTES = parseInt(process.env.TH_FIRE_IN_MINUTES || "20");

// --- Validate env ---
if (!TELEGRAM_BOT_TOKEN || !TH_PAYMENT_ACCOUNT_ID) {
  console.error("❌ Missing required env vars. Check your .env file.");
  process.exit(1);
}
if (!TH_REFRESH_TOKEN && !TH_JWT_TOKEN) {
  console.error("❌ Must set either TH_REFRESH_TOKEN or TH_JWT_TOKEN in .env");
  process.exit(1);
}

// --- Init auth then start bot ---
await initAuth(TH_REFRESH_TOKEN, TH_JWT_TOKEN);

// --- Telegram bot ---
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

console.log("☕ Tim Hortons bot is running...");

// Trigger phrases Geet can send
const ORDER_TRIGGERS = [
  "order my coffee",
  "order coffee",
  "coffee",
  "tims",
  "order",
  "☕",
];

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;
  const text = msg.text?.toLowerCase().trim() || "";

  // Security: only allow the configured user
  if (userId !== ALLOWED_USER_ID) {
    console.log(`⚠️ Unauthorized user tried to order: ${userId}`);
    return;
  }

  // Check if message is an order trigger
  const isOrderRequest = ORDER_TRIGGERS.some((trigger) =>
    text.includes(trigger),
  );

  if (!isOrderRequest) {
    if (text === "/start" || text === "/help") {
      await bot.sendMessage(
        chatId,
        `☕ *Tim Hortons Bot*\n\nJust send me "coffee" or "order my coffee" and I'll place your usual order!\n\n*Your usual:* Small Original Blend, 2 cream, 2 sugar\n*Pickup in:* ${TH_FIRE_IN_MINUTES} minutes`,
        { parse_mode: "Markdown" },
      );
    }
    return;
  }

  // Acknowledge immediately
  await bot.sendMessage(chatId, "☕ On it! Placing your order...");

  // Place the order
  const result = await placeUsualOrder({
    token: getIdToken(),
    restaurantId: TH_RESTAURANT_ID,
    paymentAccountId: TH_PAYMENT_ACCOUNT_ID,
    fireOrderInMinutes: TH_FIRE_IN_MINUTES,
  });

  if (result.success) {
    if (process.env.DRY_RUN === "true") {
      await bot.sendMessage(
        chatId,
        `🧪 *Dry run — no real order placed*\n\nEverything went through successfully. Set \`DRY_RUN=false\` in .env to place real orders.`,
        { parse_mode: "Markdown" },
      );
      return;
    }

    const readyTime = new Date(Date.now() + TH_FIRE_IN_MINUTES * 60 * 1000);
    const readyStr = readyTime.toLocaleTimeString("en-CA", {
      hour: "2-digit",
      minute: "2-digit",
    });

    await bot.sendMessage(
      chatId,
      `✅ *Order placed!*\n\nSmall Original Blend\n2 cream · 2 sugar\n\n🕐 Ready around *${readyStr}*\n📍 Just walk in and pick it up!`,
      { parse_mode: "Markdown" },
    );
  } else {
    const isAuthError =
      result.error?.toLowerCase().includes("401") ||
      result.error?.toLowerCase().includes("unauthorized") ||
      result.error?.toLowerCase().includes("token");

    if (isAuthError) {
      await bot.sendMessage(
        chatId,
        `⚠️ *Auth token expired*\n\nThe bot owner needs to refresh the token. Check the README for how to do this.\n\nSorry! Order it manually for now 😬`,
        { parse_mode: "Markdown" },
      );
    } else {
      await bot.sendMessage(
        chatId,
        `❌ Order failed. Check your payment method or try again.`,
      );
    }
  }
});

// Handle polling errors gracefully
bot.on("polling_error", (err) => {
  console.error("Polling error:", err.message);
});
