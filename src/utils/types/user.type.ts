export type TUser = {
  id: number;
  telegram_id: number;
  uid: string;
  phone: string;
  username: string;
  name: string;
  spot_balance: number;
  contract_balance: number;
  joined: boolean;
  joined_at: string | null;
  left_at: string | null;
  is_admin: boolean;
  is_banned: boolean;
  banned_at: string | null;
  warning_count: number;
  last_warning_at: string | null;
  lang: "fa" | "en";
};
