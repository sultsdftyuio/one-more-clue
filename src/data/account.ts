export const accountCopy = {
  eyebrow: "Detective file",
  fallbackName: "Detective",
  signedInAs: "Signed in as",
  joined: (date: string) => `On the force since ${date}`,
  unlocked: (count: number, total: number) => `${count} of ${total} cases unlocked`,
  logout: "Log out",
  shelf: {
    heading: "Your case shelf",
    sub: "Host any unlocked case for up to six friends. They join with a link, no account needed.",
  },
  status: {
    free: "Free",
    owned: "Unlocked",
    locked: "Locked",
    refunded: "Refunded",
    soon: "Coming soon",
  },
  host: "Host this case",
  bundle: {
    eyebrow: "Season 1 bundle",
    title: (count: number) => `Unlock all ${count} cases`,
    save: (amount: string) => `Save ${amount}`,
    buy: (price: string) => `Get the bundle · ${price}`,
  },
  purchase: {
    complete: "Payment received. Your case can take a minute to unlock here.",
    owned: "You already own that case.",
    failed: "Checkout couldn't start. Nothing was charged. Please try again.",
  },
  buyPrompt: "Ready to open it?",
  help: "Problem with a purchase or a refund?",
};
