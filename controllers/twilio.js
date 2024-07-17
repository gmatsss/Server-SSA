const twilio = require("twilio");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const apiKeySid = process.env.TWILIO_API_KEY_SID;
const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
const twimlAppSid = process.env.TWILIO_TWIML_APP_SID;

if (!accountSid || !authToken || !apiKeySid || !apiKeySecret || !twimlAppSid) {
  console.error("One or more environment variables are missing.");
}

console.log("TWILIO_ACCOUNT_SID:", accountSid);
console.log("TWILIO_AUTH_TOKEN:", authToken);
console.log("TWILIO_API_KEY_SID:", apiKeySid);
console.log("TWILIO_API_KEY_SECRET:", apiKeySecret);
console.log("TWILIO_TWIML_APP_SID:", twimlAppSid);

const client = new twilio(accountSid, authToken);

exports.generateToken = (req, res) => {
  const AccessToken = twilio.jwt.AccessToken;
  const VoiceGrant = AccessToken.VoiceGrant;

  const identity = "SSA";

  const token = new AccessToken(accountSid, apiKeySid, apiKeySecret, {
    identity: identity,
  });

  const voiceGrant = new VoiceGrant({
    outgoingApplicationSid: twimlAppSid,
    incomingAllow: true,
  });

  token.addGrant(voiceGrant);
  token.identity = identity;

  console.log("Generated token:", token.toJwt());

  res.json({ token: token.toJwt() });
};
