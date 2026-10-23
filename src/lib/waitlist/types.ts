export type WaitlistEntry = {
  email: string;
  /** Where the visitor came from, e.g. "tiktok" from /play?ref=tiktok. */
  source: string;
  createdAt: string;
};

export type JoinResult = "added" | "already";

export type WaitlistStore = {
  add(entry: WaitlistEntry): Promise<JoinResult>;
};
