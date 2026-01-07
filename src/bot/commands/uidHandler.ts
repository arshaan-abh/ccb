import { BotContext, UserState } from "..";
import * as db from "../../database";
import { i18n } from "../../locale";
import { mainMenuKeyboard } from "../../utils/main-menu-keyboard";
import { createInviteLink } from "../helpers/createInviteLink";
import { formatTimePeriod } from "../../utils/formatTimePeriod";

export async function uidHandler(
  ctx: BotContext,
  bot: any,
  userState: Map<number, UserState>,
) {
  if (!ctx.message || !("text" in ctx.message) || !ctx.from) return;
  if (ctx.message.text.startsWith("/")) return;
  if (userState.get(ctx.from!.id) !== "AWAITING_UID") return;

  const user = await db.getUserByTelegramId(ctx.from.id);
  const lang = user?.lang || "en";

  try {
    const uid = ctx.message.text.trim();

    const existingUser = await db.getUserByTelegramId(ctx.from!.id);
    if (existingUser?.uid) {
      await ctx.reply(i18n(lang, "cannotChangeUid"), mainMenuKeyboard(lang));
      userState.delete(ctx.from!.id);
      return;
    }

    const uidUser = await db.getUserByUid(uid);

    if (uidUser?.telegram_id) {
      await ctx.reply(i18n(lang, "uidAlreadyUsed"), mainMenuKeyboard(lang));
      userState.delete(ctx.from!.id);
      return;
    }

    if (!uidUser) {
      await ctx.reply(i18n(lang, "uidDoesntExist"), mainMenuKeyboard(lang));
      return;
    }

    await db.saveUser({
      telegram_id: ctx.from!.id,
      uid: uid,
      username: ctx.from.username,
      name: `${ctx.from.first_name} ${ctx.from.last_name || ""}`.trim(),
    });

    ctx.user = await db.getUserByTelegramId(ctx.from!.id);

    await ctx.reply(i18n(lang, "uidSaved"));

    const threshold = await db.getThreshold();
    const balance = db.getTotalBalance(ctx.user);
    if (balance >= threshold) {
      const link = await createInviteLink(bot, process.env.CHANNEL_ID!);
      const inviteExpireMinutes = 1;
      await ctx.reply(
        i18n(lang, "inviteSent", link, formatTimePeriod(lang, inviteExpireMinutes)),
        mainMenuKeyboard(lang),
      );
    } else {
      await ctx.reply(
        i18n(lang, "belowThreshold", threshold, balance),
        mainMenuKeyboard(lang),
      );
    }
  } catch (error) {
    console.error(new Date().toString(), "Error processing UID input:", error);
    await ctx.reply(i18n(lang, "error"), mainMenuKeyboard(lang));
  }
  userState.delete(ctx.from!.id);
  return;
}
