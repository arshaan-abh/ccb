import { BotContext, UserState } from "..";
import * as db from "../../database";
import { i18n } from "../../locale";
import { createInviteLink } from "../helpers/createInviteLink";
import { Markup, Telegraf } from "telegraf";
import { isChannelMember } from "../helpers/isChannelMember";
import { mainMenuKeyboard } from "../../utils/main-menu-keyboard";
import { formatTimePeriod } from "../../utils/formatTimePeriod";

export async function startHandler(
  ctx: BotContext,
  bot: Telegraf<BotContext>,
  userState: Map<number, UserState>,
) {
  const chat = ctx.chat || ctx.callbackQuery?.message?.chat;

  if (!chat) return;
  if (chat.type !== "private") return; // Skip if not a private chat

  const user = await db.getUserByTelegramId(ctx.from!.id);
  const lang = user?.lang || "en";

  if (user?.is_banned) {
    await ctx.reply(i18n(lang, "banAnnouncement"));
    return;
  }

  const isUserJoined = await isChannelMember(bot, user?.telegram_id);
  if (isUserJoined) {
    await ctx.reply(i18n(lang, "alreadyJoined"), mainMenuKeyboard(lang));
    return;
  }

  if (!user?.phone) {
    ctx.reply(
      i18n(lang, "askContact"),
      Markup.keyboard([
        [Markup.button.contactRequest(i18n(lang, "shareContact"))],
        [Markup.button.text(i18n(lang, "support"))],
      ])
        .resize()
        .oneTime(),
    );
    userState.set(ctx.from!.id, "AWAITING_CONTACT");
  } else if (!user.uid) {
    await ctx.reply(i18n(lang, "askUid"), mainMenuKeyboard(lang));

    userState.set(ctx.from!.id, "AWAITING_UID");
  } else {
    const threshold = await db.getThreshold();
    if (db.getTotalBalance(ctx.user) >= threshold) {
      const link = await createInviteLink(bot, process.env.CHANNEL_ID!);
      const inviteExpireMinutes = 1;
      await ctx.reply(
        i18n(lang, "inviteSent", link, formatTimePeriod(lang, inviteExpireMinutes)),
        mainMenuKeyboard(lang),
      );
    } else {
      await ctx.reply(
        i18n(lang, "belowThreshold", threshold, db.getTotalBalance(ctx.user)),
        mainMenuKeyboard(lang),
      );
    }
  }
}
