const twilio = require("twilio");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const apiKeySid = process.env.TWILIO_API_KEY_SID;
const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
const twimlAppSid = process.env.TWILIO_TWIML_APP_SID;
const client = new twilio(accountSid, authToken);

exports.generateToken = (req, res) => {
  console.log("TWILIO_ACCOUNT_SID:", process.env.TWILIO_ACCOUNT_SID);
  console.log("TWILIO_AUTH_TOKEN:", process.env.TWILIO_AUTH_TOKEN);
  console.log("TWILIO_API_KEY_SID:", process.env.TWILIO_API_KEY_SID);
  console.log("TWILIO_API_KEY_SECRET:", process.env.TWILIO_API_KEY_SECRET);
  console.log("TWILIO_TWIML_APP_SID:", process.env.TWILIO_TWIML_APP_SID);

  const AccessToken = twilio.jwt.AccessToken;
  const VoiceGrant = AccessToken.VoiceGrant;

  const identity = "Harry";

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
