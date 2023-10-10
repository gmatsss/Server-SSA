// controllers/apiController.js
const proxy = require("express-http-proxy");

const API_URL = "https://retune.so";

const apiProxy = proxy(API_URL, {
  proxyReqPathResolver: function (req) {
    if (req.url.startsWith("/create-thread")) {
      return `/api/chat/11ee5dba-b5d3-05f0-849b-e7dd1f1034f3/new-thread`;
    }
    if (req.url.startsWith("/get-messages")) {
      return `/api/chat/11ee5dba-b5d3-05f0-849b-e7dd1f1034f3/messages`;
    }
    return `/api${req.url}`;
  },
});

module.exports = {
  apiProxy,
};
