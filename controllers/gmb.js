const { google } = require("googleapis");
const gmbToken = require("../models/gmbToken");
require("dotenv").config();

const oAuth2Client = new google.auth.OAuth2(
  "1078804589614-4rfmn9rovb8346s2g7ln2bgarlarb7g9.apps.googleusercontent.com",
  "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",
  "https://node.customadesign.info/SSA/gmb/oauth2callback"
);

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

    const accountId = "107840789358849838159"; // You can make this dynamic if needed
    const locationId = "6810740176949048115"; // You can make this dynamic if needed

    // Save the refresh token to the database using the GMBToken model
    await GMBToken.findOneAndUpdate(
      { accountId: accountId }, // Find the document with the same accountId
      {
        refreshgmbToken: tokens.refresh_token,
        locationId: locationId,
        updatedAt: new Date(),
      }, // Update the token
      { upsert: true, new: true } // Insert if it doesn't exist, return the updated document
    );

    console.log("Refresh Token stored in DB:", tokens.refresh_token);

    // Redirect back to the check-new-posts route after successful authentication
    res.redirect("/SSA/gmb/check-new-posts");
  } catch (error) {
    console.error("Error during OAuth callback:", error);
    res.status(500).send("Failed to exchange authorization code for tokens.");
  }
};

// Function to check for new GMB posts
const checkNewPosts = async (req, res) => {
  const accountId = "107840789358849838159"; // The account ID from your image
  const locationId = "6810740176949048115"; // The location ID from your image

  try {
    // Retrieve the refresh token from the database using the GMBToken model
    const tokenDoc = await gmbToken.findOne({ accountId: accountId });

    if (!tokenDoc) {
      return res.status(400).json({
        message: "No stored refresh token. Please authenticate first.",
      });
    }

    // Set the credentials using the stored refresh token
    oAuth2Client.setCredentials({ refresh_token: tokenDoc.refreshgmbToken });

    // Use Google My Business API to fetch local posts
    const myBusiness = google.mybusinessaccountmanagement("v1"); // Ensure correct API version

    // Log that the request is starting
    console.log(
      "Fetching local posts for account:",
      accountId,
      "and location:",
      locationId
    );

    const response = await myBusiness.accounts.locations.localPosts.list({
      parent: `accounts/${accountId}/locations/${locationId}`,
    });

    // Log the full API response to understand the structure
    console.log("API Response:", response);

    // Check if response.data and localPosts exist
    const posts =
      response.data && response.data.localPosts ? response.data.localPosts : [];

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

    // Log the full error object for better debugging
    console.error(error);

    // If the error is token-related, provide a clear message
    if (
      error.message.includes("invalid_grant") ||
      error.message.includes("unauthorized")
    ) {
      return res.status(401).json({
        message: "Invalid or expired token. Please re-authenticate.",
      });
    }

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
