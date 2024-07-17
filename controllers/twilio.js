const twilio = require("twilio");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const apiKeySid = process.env.TWILIO_API_KEY_SID;
const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
const twimlAppSid = process.env.TWILIO_TWIML_APP_SID;

exports.generateToken = (req, res) => {
  const AccessToken = twilio.jwt.AccessToken;
  const VoiceGrant = AccessToken.VoiceGrant;
  const identity = "Harry";

  const accessToken = new AccessToken(accountSid, apiKeySid, apiKeySecret, {
    identity: identity,
  });

  const voiceGrant = new VoiceGrant({
    outgoingApplicationSid: twimlAppSid,
    incomingAllow: true,
  });

  accessToken.addGrant(voiceGrant);
  res.json({ token: accessToken.toJwt() });
};
