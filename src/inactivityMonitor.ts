import { Telegraf } from "telegraf";
import { BotContext } from "./bot";
import * as db from "./database";
import { isAdmin } from "./bot/helpers/isAdmin";
import { i18n } from "./locale";
import { TUser } from "./utils/types/user.type";

type AdminRecipient = {
  id: number;
  lang: "fa" | "en";
};

function parseAdminIds(): number[] {
  const raw = process.env.ADMIN_IDS;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));
  } catch {
    return [];
  }
}

function buildIsAdminContext(
  telegramId: number,
  user?: TUser,
): BotContext {
  return {
    from: { id: telegramId } as BotContext["from"],
    user,
  } as BotContext;
}

async function getAdminRecipients(): Promise<AdminRecipient[]> {
  const users = await db.getUsersWithTelegramId();
  const usersById = new Map<number, TUser>();
  for (const user of users) {
    usersById.set(user.telegram_id, user);
  }

  const candidateIds = new Set<number>();
  for (const id of parseAdminIds()) candidateIds.add(id);
  for (const user of users) candidateIds.add(user.telegram_id);

  const recipients: AdminRecipient[] = [];
  for (const id of candidateIds) {
    const user = usersById.get(id);
    const ctx = buildIsAdminContext(id, user);
    if (isAdmin(ctx)) {
      recipients.push({ id, lang: user?.lang || "en" });
    }
  }

  return recipients;
}

function formatDuration(lang: string, minutes: number): string {
  const safeMinutes = Number.isFinite(minutes) && minutes > 0 ? minutes : 1440;
  if (safeMinutes % 60 === 0) {
    const hours = safeMinutes / 60;
    if (lang === "fa") return `${hours} ساعت`;
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }
  if (lang === "fa") return `${safeMinutes} دقیقه`;
  return `${safeMinutes} minute${safeMinutes === 1 ? "" : "s"}`;
}

async function checkInactivity(bot: Telegraf<any>) {
  const thresholdMinutes = parseInt(
    process.env.INACTIVITY_THRESHOLD_MINUTES || "1440",
    10,
  );
  const warningIntervalMinutes = parseInt(
    process.env.INACTIVITY_WARNING_INTERVAL_MINUTES || "1440",
    10,
  );

  const thresholdMs =
    Number.isFinite(thresholdMinutes) && thresholdMinutes > 0
      ? thresholdMinutes * 60 * 1000
      : 24 * 60 * 60 * 1000;
  const warningIntervalMs =
    Number.isFinite(warningIntervalMinutes) && warningIntervalMinutes > 0
      ? warningIntervalMinutes * 60 * 1000
      : 24 * 60 * 60 * 1000;

  const lastStartAt = await db.getLastNonAdminStartAt();
  if (!lastStartAt) {
    await db.setLastNonAdminStartAt(new Date().toISOString());
    return;
  }

  const lastStartMs = Date.parse(lastStartAt);
  if (!Number.isFinite(lastStartMs) || lastStartMs <= 0) {
    await db.setLastNonAdminStartAt(new Date().toISOString());
    return;
  }

  const now = Date.now();
  const inactiveMs = now - lastStartMs;
  if (inactiveMs < thresholdMs) return;

  const lastWarningAt = await db.getLastInactivityWarningAt();
  const lastWarningMs = lastWarningAt ? Date.parse(lastWarningAt) : 0;
  const timeSinceWarning =
    Number.isFinite(lastWarningMs) && lastWarningMs > 0
      ? now - lastWarningMs
      : Number.POSITIVE_INFINITY;

  if (timeSinceWarning < warningIntervalMs) return;

  const recipients = await getAdminRecipients();
  if (recipients.length === 0) return;

  const inactiveMinutes = Math.floor(inactiveMs / (60 * 1000));
  const warningDelay = formatDuration("en", warningIntervalMinutes);

  for (const recipient of recipients) {
    const duration = formatDuration(recipient.lang, inactiveMinutes);
    const repeatInterval =
      recipient.lang === "en"
        ? warningDelay
        : formatDuration(recipient.lang, warningIntervalMinutes);
    try {
      await bot.telegram.sendMessage(
        recipient.id,
        i18n(recipient.lang, "inactivityWarning", duration, repeatInterval),
      );
    } catch (error) {
      console.error(
        new Date().toString(),
        `Could not warn admin ${recipient.id}:`,
        error,
      );
    }
  }

  await db.setLastInactivityWarningAt(new Date(now).toISOString());
}

export function setupInactivityMonitor(bot: Telegraf<any>) {
  const thresholdMinutes = parseInt(
    process.env.INACTIVITY_THRESHOLD_MINUTES || "1440",
    10,
  );
  const warningIntervalMinutes = parseInt(
    process.env.INACTIVITY_WARNING_INTERVAL_MINUTES || "1440",
    10,
  );
  const checkIntervalMinutes = Math.max(
    1,
    Math.min(thresholdMinutes, warningIntervalMinutes),
  );
  const checkIntervalMs = checkIntervalMinutes * 60 * 1000;

  setInterval(() => {
    checkInactivity(bot).catch((err) =>
      console.error(
        new Date().toString(),
        "Error in scheduled inactivity check:",
        err,
      ),
    );
  }, checkIntervalMs);

  checkInactivity(bot).catch((err) =>
    console.error(new Date().toString(), "Error in initial inactivity check:", err),
  );

  console.log(
    new Date().toString(),
    `Inactivity monitor scheduled every ${checkIntervalMinutes} minutes`,
  );
}
