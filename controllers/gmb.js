const { google } = require("googleapis");
require("dotenv").config();

const oAuth2Client = new google.auth.OAuth2(
  "1078804589614-4rfmn9rovb8346s2g7ln2bgarlarb7g9.apps.googleusercontent.com",
  "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",
  "https://node.customadesign.info/SSA/gmb/oauth2callback"
);

let storedRefreshToken = null;

// Generate auth URL with state
const getAuthUrl = (req, res, state) => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/business.manage"],
    state: state || "/", // Store state to redirect back to
  });
  res.redirect(authUrl);
};

// OAuth2 callback
const handleOAuth2Callback = async (req, res) => {
  const code = req.query.code;
  const state = req.query.state || "/"; // Retrieve state (where to redirect after auth)

  if (!code) {
    return res.status(400).send("Authorization code not found");
  }

  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    storedRefreshToken = tokens.refresh_token;
    console.log("Refresh Token:", storedRefreshToken);

    // Redirect back to the original page (state)
    res.redirect(state);
  } catch (error) {
    console.error("Error during OAuth callback:", error);
    res.status(500).send("Failed to exchange authorization code for tokens.");
  }
};

// Ensure authentication
const ensureAuthenticated = async (req, res, next) => {
  if (!storedRefreshToken) {
    // No refresh token, redirect to OAuth flow
    const originalUrl = req.originalUrl; // Save the original URL (e.g., /check-new-posts)
    return getAuthUrl(req, res, originalUrl); // Redirect to OAuth and pass original URL as state
  }

  // Use the refresh token to get an access token
  oAuth2Client.setCredentials({ refresh_token: storedRefreshToken });
  const { token } = await oAuth2Client.getAccessToken();
  oAuth2Client.setCredentials({ access_token: token });

  next(); // Continue to the next middleware or function
};

// Check for new posts on GMB
const checkNewPosts = async (req, res) => {
  const locationId = process.env.LOCATION_ID;
  const accountId = process.env.ACCOUNT_ID;

  try {
    // Initialize My Business API
    const myBusiness = google.mybusinessaccountmanagement({
      version: "v1",
      auth: oAuth2Client,
    });

    // Fetch the posts
    const response = await myBusiness.accounts.locations.localPosts.list({
      parent: `accounts/${accountId}/locations/${locationId}`,
    });

    // Handle the response
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

module.exports = {
  handleOAuth2Callback,
  checkNewPosts,
  ensureAuthenticated,
};
