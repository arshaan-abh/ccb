import { Telegraf, Context } from "telegraf";
import { setLangHandler } from "./commands/setLangHandler";
import { setthreshholdHandler } from "./commands/setthreshholdHandler";
import { threshholdHandler } from "./commands/threshholdHandler";
import { addAdminHandler } from "./commands/addAdminHandler";
import { statsHandler } from "./commands/statsHandler";
import { forceKickHandler } from "./commands/forceKickHandler";
import { middleware } from "./middleware";
import { helpHandler } from "./commands/helpHandler";
import { editWelcomeHandler } from "./commands/editWelcomeHandler";
import { uidHandler } from "./commands/uidHandler";
import { editWelcomeCommandHandler } from "./commands/editWelcomeCommandHandler";
import { Agent } from "https";
import { contactHandler } from "./commands/contactHandler";
import { i18n } from "../locale";
import { supportHandler } from "./commands/supportHandler";
import { setSupportHandler } from "./commands/setSupportHandler";
import { unbanUserHandler } from "./commands/unbanHandler";
import { banUserHandler } from "./commands/banUserHandler";
import { callbackHandler } from "./commands/callbackHandler";
import * as db from "../database";
import { startHandler } from "./commands/startHandler";
import { vipInfoHandler } from "./commands/vipInfoHandler";
import { uidTutorialHandler } from "./commands/uidTutorialHandler";
import { editVipInfoHandler } from "./commands/editVipInfoHandler";
import { editVipInfoCommandHandler } from "./commands/editVipInfoCommandHandler";
import { broadcastMessageHandler } from "./commands/broadcastMessageHandler";
import { broadcastCommandHandler } from "./commands/broadcastCommandHandler";
import { chatJoinRequest } from "./commands/chatJoinRequest";
import { isAdmin } from "./helpers/isAdmin";

export type UserState =
  | "AWAITING_CONTACT"
  | "AWAITING_UID"
  | "AWAITING_START_LANGUAGE"
  | "AWAITING_UPDATE_LANGUAGE"
  | "AWAITING_VIP_INFO_FA"
  | "AWAITING_VIP_INFO_EN"
  | "AWAITING_WELCOME_FA"
  | "AWAITING_WELCOME_EN"
  | "AWAITING_BROADCAST_MESSAGE";

const userState = new Map<number, UserState>();

// Add user to context
export interface BotContext extends Context {
  user?: any;
}
const agent = new Agent({
  family: 4, // Force IPv4
});
// Create bot instance
export function createBot(token: string) {
  const bot = new Telegraf<BotContext>(token, { telegram: { agent } });

  bot.telegram.setMyCommands([
    { command: "start", description: "Start the bot" },
  ]);

  // Middleware to attach user to context
  bot.use(async (ctx, next) => middleware(ctx, next));

  // Start command
  bot.start(async (ctx) => {
    if (ctx.chat?.type === "private" && !isAdmin(ctx)) {
      await db.setLastNonAdminStartAt(new Date().toISOString());
      await db.setLastInactivityWarningAt(null);
    }

    await setLangHandler(ctx, userState);
  });

  // Admin commands
  bot.command("setthreshold", async (ctx) => setthreshholdHandler(ctx));
  bot.command("setsupport", async (ctx) => setSupportHandler(ctx));
  bot.command("threshold", async (ctx) => threshholdHandler(ctx));
  bot.command("addadmin", async (ctx) => addAdminHandler(ctx));
  bot.command("stats", async (ctx) => statsHandler(ctx));
  bot.command("ban", async (ctx) => banUserHandler(ctx, bot));
  bot.command("unban", async (ctx) => unbanUserHandler(ctx, bot));
  bot.command("editWelcome", async (ctx) =>
    editWelcomeCommandHandler(ctx, userState),
  );
  bot.command("editVipInfo", async (ctx) =>
    editVipInfoCommandHandler(ctx, userState),
  );
  bot.command("broadcastMessage", async (ctx) =>
    broadcastCommandHandler(ctx, userState),
  );
  bot.command("help", async (ctx) => helpHandler(ctx));
  bot.command("forcekick", async (ctx) => forceKickHandler(ctx, bot));
  bot.on("callback_query", async (ctx) => callbackHandler(ctx, bot, userState));
  bot.on("chat_join_request", async (ctx) => {
    chatJoinRequest(ctx);
  });

  bot.on("message", async (ctx) => {
    const user = await db.getUserByTelegramId(ctx.from!.id);
    const lang = user?.lang || "en";

    if (
      "text" in ctx.message &&
      ctx.message.text === i18n(lang || "en", "support")
    )
      await supportHandler(ctx);
    else if (
      "text" in ctx.message &&
      ctx.message.text === i18n(lang || "en", "freeChannelJoin")
    )
      await startHandler(ctx, bot, userState);
    else if (
      "text" in ctx.message &&
      ctx.message.text === i18n(lang || "en", "changeLanguage")
    )
      await setLangHandler(ctx, userState, false);
    else if (
      "text" in ctx.message &&
      ctx.message.text === i18n(lang || "en", "uidTutorial")
    )
      await uidTutorialHandler(ctx);
    else if (
      "text" in ctx.message &&
      ctx.message.text === i18n(lang || "en", "vipInfo")
    )
      await vipInfoHandler(ctx);
    else if (userState.get(ctx.from!.id) == "AWAITING_CONTACT")
      await contactHandler(ctx, userState);
    else if (userState.get(ctx.from!.id) == "AWAITING_UID")
      await uidHandler(ctx, bot, userState);
    else if (userState.get(ctx.from!.id) == "AWAITING_VIP_INFO_FA")
      await editVipInfoHandler(ctx, userState, "fa");
    else if (userState.get(ctx.from!.id) == "AWAITING_VIP_INFO_EN")
      await editVipInfoHandler(ctx, userState, "en");
    else if (userState.get(ctx.from!.id) === "AWAITING_BROADCAST_MESSAGE")
      await broadcastMessageHandler(ctx, userState);
    else if (userState.get(ctx.from!.id) === "AWAITING_WELCOME_FA")
      await editWelcomeHandler(ctx, userState, "fa");
    else if (userState.get(ctx.from!.id) === "AWAITING_WELCOME_EN")
      await editWelcomeHandler(ctx, userState, "en");
  });
  return bot;
}
