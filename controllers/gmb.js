const { google } = require("googleapis");
require("dotenv").config();

const oAuth2Client = new google.auth.OAuth2(
  "1078804589614-4rfmn9rovb8346s2g7ln2bgarlarb7g9.apps.googleusercontent.com",
  "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",
  "https://node.customadesign.info/SSA/gmb/oauth2callback"
);

let storedRefreshToken = null; // You might want to persist this in a database or file

// Function to generate and redirect to the OAuth2 URL
const getAuthUrl = (req, res) => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/business.manage"],
  });
  res.redirect(authUrl);
};

// OAuth callback to handle the authorization code and exchange it for tokens
const handleOAuth2Callback = async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send("Authorization code not found");
  }

  try {
    const { tokens } = await oAuth2Client.getToken(code); // Exchange code for tokens
    oAuth2Client.setCredentials(tokens);
    storedRefreshToken = tokens.refresh_token; // Store refresh token
    console.log("Refresh Token:", storedRefreshToken);

    // Redirect back to the check-new-posts route after successful authentication
    res.redirect("/check-new-posts");
  } catch (error) {
    console.error("Error during OAuth callback:", error);
    res.status(500).send("Failed to exchange authorization code for tokens.");
  }
};

// Function to check for new Google My Business posts
const checkNewPosts = async (req, res) => {
  const locationId = process.env.LOCATION_ID;

  // If there's no stored refresh token, start OAuth flow
  if (!storedRefreshToken) {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/business.manage"],
    });
    return res.redirect(authUrl); // Redirect to OAuth2 consent page
  }

  // Set the credentials using the stored refresh token
  oAuth2Client.setCredentials({ refresh_token: storedRefreshToken });

  try {
    // Use Google My Business API to fetch local posts
    const myBusiness = google.mybusinessaccountmanagement("v1"); // Ensure correct API version
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

module.exports = {
  getAuthUrl,
  handleOAuth2Callback,
  checkNewPosts,
};
