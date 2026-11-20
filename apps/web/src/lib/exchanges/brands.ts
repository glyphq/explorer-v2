export type ExchangeListingStatus = "active" | "delisted" | "unknown";

type ExchangeBrand = {
  icon?: string;
  status: ExchangeListingStatus;
};

/**
 * Exchange symbol artwork and listing state. The Qubic exchange snapshot at
 * static.qubic.org still includes venues that have since stopped trading
 * QUBIC, so only active brands are listed on the exchanges page.
 */
const EXCHANGE_BRANDS: Record<string, ExchangeBrand> = {
  Bit2Me: {
    icon: "/exchanges/bit2me-icon.png",
    status: "delisted",
  },
  Bitget: {
    icon: "/exchanges/bitget-icon.png",
    status: "delisted",
  },
  CoinEx: {
    icon: "/exchanges/coinex-icon.svg",
    status: "delisted",
  },
  "Gate.io": {
    icon: "/exchanges/gate.png",
    status: "active",
  },
  MEXC: {
    icon: "/exchanges/mexc-icon.png",
    status: "delisted",
  },
  Safetrade: {
    icon: "/exchanges/safetrade.png",
    status: "active",
  },
  "Seven Seas": {
    status: "delisted",
  },
  Tradeogre: {
    status: "delisted",
  },
};

/**
 * Known exchange identities from the curated Qubic snapshot. Keep in sync with
 * packages/infra/migrations/0002_exchange_profiles.sql.
 */
const EXCHANGE_IDENTITIES: Record<string, string> = {
  BYBYFUMBVLPUCANXEXTSKVMGFCJBMTLPPOFVPNSATABMWDGTMFXPLZLBCXJL: "Gate.io",
  VUEYKUCYYHXKDGOSCWAIEECECDBCXVUSUAJRVXUQVAQPGIOABLGGLXDAXTNK: "MEXC",
  EXNRRBDPYFQPXFPXCMUHZVEEBRQCBEAUDYUBHKGTRCKHVSRAQXWHQCXDLZXL: "Bitget 1",
  XYXGGGOWOYILTAAGGACSRWSANJJCKJQPEAECEYWKDDZDIYELTJPTDIVEHIUA: "Bitget 2",
  JAKDBYHQOUICADHMNZMCMQIUVLZCTCCGEYNLBBGPBFNNTVZZCBCIMWICCFHN: "Bitget 3",
  IZTNWDKXSFULQADTOLTMLUPHSCFCXLOJMQOUHPBSRGQZMMXZCJYQFTRDOGRE: "Tradeogre 1",
  GBXUREVUSESZWAFCHPESIYLBBODDFFFZJUXUGJAJIFPFHMJSJRGQHONDGQFL: "Tradeogre 2",
  ETAWVIXKLVEBCFCNJBNFWMMZFGOAKBXTMARNBWYIKECASQWWBEXODQWBVBGK: "Tradeogre 3",
  XXIOIPKQRCJIMAVIXQQTRWQVPKPCOUSHVUPPRWDSDDXYSKTJOHUKXZICPRDA: "Tradeogre 4",
  BKCTLMGCIUAADAZQVCQCOFTGCYRDIKQRUYKWYKLEGHBELRBDLIQGRWAGFWQD: "Tradeogre 5",
  NUJKVAKTLNMHMFMBZCXSHCLBYRPCTZVOWPWXGRTKLARFUTBVTPVELHBHYAHL: "Tradeogre 6",
  CLJHHZVRWAVBEAECXMCEIZOZOJLAMWCQMNYXXHQXOBGRUCXKVZCMBQECQJPE: "Safetrade 1",
  VFWIEWBYSIMPBDHBXYFJVMLGKCCABZKRYFLQJVZTRBUOYSUHOODPVAHHKXPJ: "Safetrade 2",
  EMSSYMCBMVXSSBZZDFFNLYTVZBVBWQNAWIEDYZLBDCFYIBAKFUOOGWLAEXCL: "Safetrade 3",
  WTBHNKRMCBHKNGZAUQQQRTUOTPRAXRQTMSJKZLFKHABABZDDNDXIZXZGNJXE: "Safetrade 4",
  CORSXCFMCTVSECCTNFEERFVUPTKDRGKALTIOWKLXSBQCSIGNTUGEKOXDNUGK: "Safetrade 5",
  RGTOAPIIMQMFMDPQOIYLFEXOVNZAQRWMIMKMRVSKGFFIRMXXQPWQPRWAGHHI: "CoinEx",
  LZLDOEIBQWIUGGMZGOISLOAACDGAFVAMAYXSSJMLQBHSHWDBPMSDFTGAYRMN: "Seven Seas",
  RCIMKHPGSPKDIDUKYVKZPUWYUAABOAEOMATIRNMKTASTUCJGURETZKLESSTL: "Bit2Me",
};

/** Removes the account suffix so "Bitget 2" and "Bitget 3" share a brand. */
export function exchangeBrandName(displayName: string): string {
  return displayName.replace(/\s+\d+$/, "").trim() || displayName;
}

export function exchangeBrand(displayName: string): ExchangeBrand | undefined {
  return EXCHANGE_BRANDS[exchangeBrandName(displayName)];
}

export function exchangeListingStatus(displayName: string): ExchangeListingStatus {
  return exchangeBrand(displayName)?.status ?? "unknown";
}

export function isExchangeDelisted(displayName: string): boolean {
  return exchangeListingStatus(displayName) === "delisted";
}

export function isExchangeActive(displayName: string): boolean {
  return exchangeListingStatus(displayName) === "active";
}

export function exchangeNameForIdentity(identity: string): string | undefined {
  return EXCHANGE_IDENTITIES[identity.toUpperCase()];
}

export function exchangeIconForIdentity(identity: string): string | undefined {
  const name = exchangeNameForIdentity(identity);
  return name ? exchangeBrand(name)?.icon : undefined;
}
