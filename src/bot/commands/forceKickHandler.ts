import { Telegraf } from "telegraf";
import { BotContext } from "..";
import * as db from "../../database";
import { i18n } from "../../locale";
import { isAdmin } from "../helpers/isAdmin";
import { kickUserFromChannel } from "../helpers/kickUserFromChannel";
import { mainMenuKeyboard } from "../../utils/main-menu-keyboard";

export async function forceKickHandler(
  ctx: BotContext,
  bot: Telegraf<BotContext>,
) {
  if (!ctx.chat) return;
  if (ctx.chat.type !== "private") return; // Skip if not a private chat

  const user = await db.getUserByTelegramId(ctx.from!.id);
  const lang = user?.lang || "en";

  if (!isAdmin(ctx)) {
    await ctx.reply(i18n(lang, "adminOnly"), mainMenuKeyboard(lang));
    return;
  }

  await ctx.reply("Starting force kick process...");

  const threshold = await db.getThreshold();
  const users = await db.getJoinedUsersBelowThreshold(threshold);
  let kickedCount = 0;

  for (const user of users) {
    try {
      // Kick user
      await kickUserFromChannel(bot, user.telegram_id);
      await db.markUserLeft(user.telegram_id);
      kickedCount++;

      // Notify user
      try {
        await bot.telegram.sendMessage(
          user.telegram_id,
          i18n(lang, "kickedDueToBalance"),
        );
      } catch (notifyError) {
        console.error(
          new Date().toString(),
          `Could not notify user ${user.telegram_id}:`,
          notifyError,
        );
      }
    } catch (kickError) {
      console.error(
        new Date().toString(),
        `Error kicking user ${user.telegram_id}:`,
        kickError,
      );
    }
  }

  await ctx.reply(
    `Force kick completed. ${kickedCount} users were removed.`,
    mainMenuKeyboard(lang),
  );
}
