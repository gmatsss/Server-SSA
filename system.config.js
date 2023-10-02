module.exports = {
  apps: [
    {
      name: "my-app",
      script: "./app.js",
      env: {
        MONGO_URI:
          "mongodb+srv://gabrielmaturan:9HkJX8Aid79ZuLP4@koworks.xsienwk.mongodb.net/SuperSmartAgent",
        TOKEN_KEY: "LinkageKoWorks",

        // other environment variables
      },
    },
  ],
};
