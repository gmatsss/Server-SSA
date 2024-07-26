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

const dynamicChatProxy = proxy(API_URL, {
  proxyReqPathResolver: function (req) {
    const chatId = req.body.chatId;
    if (req.url.startsWith("/create-dynamic-thread")) {
      return `/api/chat/${chatId}/new-thread`;
    }
    if (req.url.startsWith("/get-dynamic-messages")) {
      return `/api/chat/${chatId}/messages`;
    }
    return `/api${req.url}`;
  },
  proxyReqBodyDecorator: function (bodyContent, srcReq) {
    const { chatId, ...rest } = bodyContent;
    return rest;
  },
});

module.exports = {
  apiProxy,
  dynamicChatProxy,
};
