const { google } = require("googleapis");
require("dotenv").config();

const oAuth2Client = new google.auth.OAuth2(
  "1078804589614-4rfmn9rovb8346s2g7ln2bgarlarb7g9.apps.googleusercontent.com",
  "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",
  "https://node.customadesign.info/SSA/gmb/oauth2callback"
);
let storedRefreshToken = null;

// Helper function to refresh token if necessary
const refreshAccessTokenIfNeeded = async () => {
  if (!storedRefreshToken) {
    throw new Error("No refresh token stored. Please authenticate first.");
  }

  oAuth2Client.setCredentials({ refresh_token: storedRefreshToken });
  const { credentials } = await oAuth2Client.getAccessToken();
  return credentials.access_token;
};

// Handle OAuth2 callback
const handleOAuth2Callback = async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send("Authorization code not found");
  }

  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    storedRefreshToken = tokens.refresh_token || storedRefreshToken;
    console.log("Refresh Token:", storedRefreshToken);
    res.status(200).send("Authorization successful, refresh token stored!");
  } catch (error) {
    console.error("Error during OAuth callback:", error);
    res.status(500).send("Failed to exchange authorization code for tokens.");
  }
};

// Fetch posts after ensuring authentication
const checkNewPosts = async (req, res) => {
  const locationId = process.env.LOCATION_ID;

  try {
    // Step 1: Ensure access token is available or refresh it
    const accessToken = await refreshAccessTokenIfNeeded();

    // Step 2: Set the credentials to use the newly refreshed token
    oAuth2Client.setCredentials({ access_token: accessToken });

    // Step 3: Proceed to fetch posts
    const myBusiness = google.mybusiness({
      version: "v4",
      auth: oAuth2Client,
    });

    const response = await myBusiness.accounts.locations.localPosts.list({
      parent: `accounts/${process.env.ACCOUNT_ID}/locations/${locationId}`,
    });

    const posts = response.data.localPosts || [];
    if (posts.length > 0) {
      res.status(200).json({
        message: "New posts found",
        posts: posts.map((post) => ({
          postId: post.name,
          summary: post.summary,
          createdTime: post.createTime,
        })),
      });
    } else {
      res.status(200).json({ message: "No new posts." });
    }
  } catch (error) {
    console.error("Error fetching posts:", error.message);
    res
      .status(500)
      .json({ message: "Error fetching posts", error: error.message });
  }
};

// Route to trigger OAuth2 flow and redirect to Google's consent screen
const getAuthUrl = (req, res) => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/business.manage"],
  });
  res.redirect(authUrl);
};

module.exports = {
  getAuthUrl,
  handleOAuth2Callback,
  checkNewPosts,
};
