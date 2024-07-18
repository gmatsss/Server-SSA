const twilio = require("twilio");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const apiKeySid = process.env.TWILIO_API_KEY_SID;
const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
const twimlAppSid = process.env.TWILIO_TWIML_APP_SID;
const client = new twilio(accountSid, authToken);

exports.checkCredentials = async (req, res) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  try {
    const client = new twilio(accountSid, authToken);
    const account = await client.api.accounts(accountSid).fetch();
    res.status(200).send({
      message: "Credentials are valid",
      account: account,
    });
  } catch (error) {
    console.error("Credential validation error:", error);
    res.status(500).send({
      message: "Failed to validate credentials",
      error: error.message,
    });
  }
};

exports.validateApiKey = (req, res) => {
  const apiKeySid = process.env.TWILIO_API_KEY_SID;
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const twimlAppSid = process.env.TWILIO_TWIML_APP_SID;

  try {
    // Generate a token using the API Key SID and Secret
    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    const identity = "TestIdentity"; // Use a test identity

    const accessToken = new AccessToken(accountSid, apiKeySid, apiKeySecret, {
      identity,
    });
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: twimlAppSid,
      incomingAllow: true,
    });

    accessToken.addGrant(voiceGrant);
    const jwt = accessToken.toJwt();

    console.log("Successfully generated token with API Key and Secret:", jwt);
    res.status(200).send({
      message: "API Key and Secret are valid",
      token: jwt,
    });
  } catch (error) {
    console.error("Error with API Key and Secret:", error);
    res.status(500).send({
      message: "API Key and Secret validation failed",
      error: error.message,
    });
  }
};

exports.generateVoiceToken = (req, res) => {
  try {
    if (!accountSid || !apiKeySid || !apiKeySecret || !twimlAppSid) {
      throw new Error("Twilio credentials or application SID are not set.");
    }

    const identity = "user"; // Or generate a unique identity if needed
    console.log(`Generating token for identity: ${identity}`);

    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    const accessToken = new AccessToken(accountSid, apiKeySid, apiKeySecret, {
      identity,
    });

    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: twimlAppSid,
      incomingAllow: false, // Enable incoming calls if necessary
    });

    accessToken.addGrant(voiceGrant);
    const jwt = accessToken.toJwt();

    res.json({
      identity: identity,
      token: jwt,
    });
  } catch (error) {
    console.error("Error generating Twilio token:", error);
    res.status(500).send({
      message: "Failed to generate Twilio token",
      error: error.message,
    });
  }
};

exports.handleVoiceRequest = (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();
  twiml.dial({ callerId: "+16292228993" }, "+18704104327"); // Replace with the correct phone number
  res.type("text/xml");
  res.send(twiml.toString());
};
