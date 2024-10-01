const { google } = require("googleapis");
require("dotenv").config();

const oAuth2Client = new google.auth.OAuth2(
  "1078804589614-4rfmn9rovb8346s2g7ln2bgarlarb7g9.apps.googleusercontent.com",
  "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",
  "https://node.customadesign.info/SSA/gmb/oauth2callback"
);

let storedRefreshToken = null;

const getAuthUrl = (req, res) => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/business.manage"],
  });
  res.redirect(authUrl);
};

const handleOAuth2Callback = async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send("Authorization code not found");
  }

  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    storedRefreshToken = tokens.refresh_token;
    console.log("Refresh Token:", storedRefreshToken);
    res.status(200).send("Authorization successful, refresh token stored!");
  } catch (error) {
    console.error("Error during OAuth callback:", error);
    res.status(500).send("Failed to exchange authorization code for tokens.");
  }
};

const ensureAuthenticated = async (req, res) => {
  if (!storedRefreshToken) {
    // If no refresh token is stored, redirect to OAuth flow
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/business.manage"],
    });
    res.redirect(authUrl); // Send the user to Google for authentication
    return false;
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
