// Step 1: Importing required modules
const express = require("express");
const mongoose = require("mongoose");
const morgan = require("morgan");
const cors = require("cors");
const bodyParser = require("body-parser");
const passport = require("passport");
const session = require("express-session");

require("dotenv").config();

// Step 2: Creating Express app
const app = express();

// Step 3: Middleware configuration for logging and parsing requests
app.use(morgan("dev"));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Step 4: CORS configuration
const allowedOrigins = [
  "http://localhost:8000",
  "http://localhost:3000",
  "http://ssa.customadesign.info",
  "http://34.199.84.82:3000",
];

const corsOptions = {
  origin: function (origin, callback) {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: "GET,POST",
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// Step 5: Session configuration
app.use(
  session({
    secret: "your_strong_secret",
    resave: true,
    saveUninitialized: false,
    cookie: {
      sameSite: "lax", // 'lax' is more lenient than 'strict' but still provides some level of CSRF protection
      secure: false, // Set to false since you're not using HTTPS
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

// Step 6: Passport initialization
app.use(passport.initialize());
app.use(passport.session());
const initializePassport = require("./middleware/passport");
initializePassport(passport);

// Step 7: Database connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to DB"))
  .catch((err) => console.log("Error connecting to DB"));

// Step 8: Importing and using routes
const testRoutes = require("./routes/test");
app.use("/", testRoutes);
const User = require("./routes/User");
app.use("/User", User);
const retune = require("./routes/retune");
app.use("/retune", retune);

// Step 11: Port configuration
const port = process.env.PORT || 8001;

// Step 12: Starting the server
app.listen(port, () =>
  console.log(`Server is running at http://localhost:${port}`)
);
