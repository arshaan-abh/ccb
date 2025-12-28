import { initDb } from "./database";
import { createBot } from "./bot";
import { setupBalanceSync } from "./loop";
import { consts } from "./utils/consts";
import { setupChannelSync } from "./channelSync";
import { setupInactivityMonitor } from "./inactivityMonitor";

async function main() {
  while (true) {
    try {
      // Initialize database
      await initDb();

      // Create bot
      const bot = createBot(consts.botToken);

      // Setup channel sync
      setupChannelSync(bot);

      // Setup balance sync
      setupBalanceSync(bot);

      // Setup inactivity warnings
      setupInactivityMonitor(bot);

      // Start bot with retry logic
      const MAX_RETRIES = 10;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          await bot.launch();
          console.log(new Date().toString(), "Bot started successfully");
          break; // success
        } catch (e) {
          console.log(
            new Date().toString(),
            `Launch failed (attempt ${attempt}):`,
            e,
          );
          if (attempt === MAX_RETRIES) throw e;
          await new Promise((res) => setTimeout(res, 1000));
        }
      }

      // Graceful shutdown handlers
      process.once("SIGINT", async () => {
        console.log(new Date().toString(), "Received SIGINT, stopping bot...");
        try {
          bot.stop("SIGINT");
        } catch {}
        process.exit(0);
      });

      process.once("SIGTERM", async () => {
        console.log(new Date().toString(), "Received SIGTERM, stopping bot...");
        try {
          bot.stop("SIGTERM");
        } catch {}
        process.exit(0);
      });

      process.once("uncaughtException", async (err) => {
        console.error(new Date().toString(), "Uncaught Exception:", err);
        try {
          bot.stop("uncaughtException");
        } catch {}
        process.exit(1);
      });

      process.once("unhandledRejection", async (reason) => {
        console.error(new Date().toString(), "Unhandled Rejection:", reason);
        try {
          bot.stop("unhandledRejection");
        } catch {}
        process.exit(1);
      });

      break; // exit while(true) after successful start
    } catch (error) {
      console.error(
        new Date().toString(),
        "Error starting application:",
        error,
      );
      console.log(
        new Date().toString(),
        "Restarting application in 3 seconds...",
      );
      await new Promise((res) => setTimeout(res, 3000));
    }
  }
}

main();
