// controllers/moonclerkController.js
const proxy = require("express-http-proxy");

const MOONCLERK_API_URL = "https://api.moonclerk.com/";

const moonClerkProxy = proxy(MOONCLERK_API_URL, {
  proxyReqPathResolver: (req) => {
    console.log(req.url);
    return `${req.url}`;
  },
});

module.exports = {
  moonClerkProxy,
};
