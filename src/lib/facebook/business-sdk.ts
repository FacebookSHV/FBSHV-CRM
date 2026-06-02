export async function getBusinessSdkStatus() {
  try {
    const mod = await import("facebook-nodejs-business-sdk");
    const hasAdAccount = typeof mod.AdAccount === "function";
    const hasCampaign = typeof mod.Campaign === "function";
    return {
      installed: true,
      provider: "facebook/facebook-nodejs-business-sdk",
      version: "24.0.1",
      usable: hasAdAccount && hasCampaign,
      mode: "official_sdk_available"
    };
  } catch {
    return {
      installed: true,
      provider: "facebook/facebook-nodejs-business-sdk",
      version: "24.0.1",
      usable: false,
      mode: "cloudflare_fetch_adapter"
    };
  }
}
