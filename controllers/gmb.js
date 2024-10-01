const { google } = require("googleapis");
require("dotenv").config();

const oAuth2Client = new google.auth.OAuth2(
  "1078804589614-4rfmn9rovb8346s2g7ln2bgarlarb7g9.apps.googleusercontent.com",
  "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",
  "https://node.customadesign.info/SSA/gmb/oauth2callback"
);

let storedRefreshToken = null;

// Function to start the OAuth flow and redirect back to the original request
const getAuthUrl = (req, res) => {
  const originalUrl = req.query.redirect || "/"; // Capture the original URL
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/business.manage"],
    state: originalUrl, // Pass the original URL as part of the OAuth state
  });
  res.redirect(authUrl);
};

// OAuth2 callback to handle the authorization code and exchange it for tokens
const handleOAuth2Callback = async (req, res) => {
  const code = req.query.code;
  const originalUrl = req.query.state || "/"; // Get the original URL from state

  if (!code) {
    return res.status(400).send("Authorization code not found");
  }

  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    storedRefreshToken = tokens.refresh_token;
    console.log("Refresh Token:", storedRefreshToken);

    // Redirect back to the original URL after successful authentication
    res.redirect(originalUrl);
  } catch (error) {
    console.error("Error during OAuth callback:", error);
    res.status(500).send("Failed to exchange authorization code for tokens.");
  }
};

// Ensure we have valid credentials or initiate OAuth flow
const ensureAuthenticated = async (req, res) => {
  if (!storedRefreshToken) {
    // If no refresh token is stored, redirect to OAuth flow and capture original URL
    return res.redirect(`/gmb/auth?redirect=${req.originalUrl}`);
  }

  // If refresh token is stored, use it to get a new access token
  oAuth2Client.setCredentials({ refresh_token: storedRefreshToken });
  const { token } = await oAuth2Client.getAccessToken();
  oAuth2Client.setCredentials({ access_token: token });

  return true;
};

// Function to check for new posts on Google My Business
const checkNewPosts = async (req, res) => {
  const locationId = process.env.LOCATION_ID;
  const accountId = process.env.ACCOUNT_ID;

  try {
    // Ensure authentication before proceeding
    const isAuthenticated = await ensureAuthenticated(req, res);

    // If not authenticated (i.e., redirected for OAuth), stop execution
    if (!isAuthenticated) return;

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
  getAuthUrl,
  handleOAuth2Callback,
  checkNewPosts,
};
