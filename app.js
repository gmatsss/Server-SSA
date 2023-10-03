// Step 1: Importing required modules
const express = require("express");
const mongoose = require("mongoose");
const morgan = require("morgan");
const cors = require("cors");
const bodyParser = require("body-parser");
const passport = require("passport");
const session = require("express-session");
const https = require("https"); // Import HTTPS module
const fs = require("fs"); // Import File System module

require("dotenv").config();

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
      sameSite: "none", // or 'strict'
      secure: true,
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

// Step 9: HTTPS server options
const serverOptions = {
  key: fs.readFileSync("server.key"),
  cert: fs.readFileSync("server.crt"),
};

// Step 10: Creating HTTPS server
const server = https.createServer(serverOptions, app);

// Step 11: Port configuration
const port = process.env.PORT || 8001;

// Step 12: Starting the server
server.listen(port, () =>
  console.log(`Server is running at https://localhost:${port}`)
);
