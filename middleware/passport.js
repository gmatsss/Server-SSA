const User = require("../models/User");

//hasing password
const bcrypt = require("bcryptjs");
const localStrategy = require("passport-local").Strategy;

module.exports = function (passport) {
  // Local strategy for Passport
  passport.use(
    new localStrategy(
      {
        usernameField: "email", // Tell Passport.js to use 'email' as the username field
      },
      async function (email, password, done) {
        try {
          const user = await User.findOne({ email: email });
          if (!user) {
            return done(null, false, { message: "No user exists" });
          }

          const result = await bcrypt.compare(password, user.password);
          if (result === true) {
            return done(null, user);
          } else {
            return done(null, false, { message: "Incorrect password" });
          }
        } catch (err) {
          console.log(err);
          return done(err);
        }
      }
    )
  );

  // Serialize user into the session
  passport.serializeUser(function (user, done) {
    done(null, user.id);
  });

  // Deserialize user from the session
  passport.deserializeUser((id, done) => {
    User.findById(id)
      .then((user) => {
        done(null, user);
      })
      .catch((err) => {
        done(err, null);
      });
  });
};
