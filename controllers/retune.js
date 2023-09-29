// controllers/apiController.js
const proxy = require("express-http-proxy");

const API_URL = "https://retune.so";

const apiProxy = proxy(API_URL, {
  proxyReqPathResolver: function (req) {
    if (req.url.startsWith("/create-thread")) {
      return `/api/chat/11ee5547-2718-3180-8654-63b6aca533f6/new-thread`;
    }
    if (req.url.startsWith("/get-messages")) {
      return `/api/chat/11ee5547-2718-3180-8654-63b6aca533f6/messages`;
    }
    return `/api${req.url}`;
  },
});

module.exports = {
  apiProxy,
};
