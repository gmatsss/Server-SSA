const proxy = require("express-http-proxy");

const API_URL = "https://retune.so";

const dynamicSSAProxy = proxy(API_URL, {
  proxyReqPathResolver: function (req) {
    const botId = req.params.botId; // Assuming the botId is passed in the URL parameter

    console.log("Bot ID (proxyReqPathResolver):", botId);

    console.log(req.url);

    // Explicitly construct the URL without relying on req.url to prevent issues
    if (req.originalUrl.includes("new-thread")) {
      const url = `/api/chat/${botId}/new-thread`;
      console.log("Constructed URL:", url);
      return url;
    }

    if (req.originalUrl.includes("messages")) {
      const url = `/api/chat/${botId}/messages`;
      console.log("Constructed URL:", url);
      return url;
    }

    return `/api${req.url}`;
  },
  proxyReqOptDecorator: function (proxyReqOpts, srcReq) {
    const apiKey =
      srcReq.headers["x-api-key"] || srcReq.headers["X-Retune-API-Key"];

    console.log("API Key (proxyReqOptDecorator):", apiKey);

    // Only add the API Key header, no need for X-Bot-ID
    proxyReqOpts.headers["X-Retune-API-Key"] = `${apiKey}`;

    return proxyReqOpts;
  },
  proxyReqBodyDecorator: function (bodyContent, srcReq) {
    console.log("Body Content (proxyReqBodyDecorator):", bodyContent);

    // Simply forward the body content, without removing anything
    return bodyContent;
  },
});

module.exports = {
  dynamicSSAProxy,
};
