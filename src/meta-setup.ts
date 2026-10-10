/** Registers only StockRescue's callback. It never changes another app's subscription. */
export async function configureMetaWebhook(
  env: NodeJS.ProcessEnv,
  origin: string,
  transport: typeof fetch = fetch,
) {
  const appId = env.STOCKRESCUE_META_APP_ID ?? "1898550861524224";
  const waba = env.STOCKRESCUE_WABA_ID ?? "967650119417397";
  const secret = env.WHATSAPP_APP_SECRET,
    token = env.WHATSAPP_ACCESS_TOKEN,
    verify = env.WHATSAPP_VERIFY_TOKEN;
  if (!secret || !token || !verify || !/^https:\/\//.test(origin))
    throw new Error("META_SETUP_INCOMPLETE");
  const post = async (path: string, authorization: string, body: object) => {
    const r = await transport("https://graph.facebook.com/v26.0/" + path, {
      method: "POST",
      redirect: "error",
      headers: {
        Authorization: "Bearer " + authorization,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) throw new Error("META_SETUP_HTTP_" + r.status);
    const data = await r.json();
    if (data.success !== true) throw new Error("META_SETUP_NOT_CONFIRMED");
  };
  await post(appId + "/subscriptions", appId + "|" + secret, {
    object: "whatsapp_business_account",
    callback_url: origin + "/webhooks/whatsapp",
    verify_token: verify,
    fields: "messages",
  });
  await post(waba + "/subscribed_apps", token, {});
}
