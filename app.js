const express = require("express");
const mongoose = require("mongoose");
const morgan = require("morgan");
const cors = require("cors");
const bodyParser = require("body-parser");
const passport = require("passport");
const session = require("express-session");
const MongoStore = require("connect-mongo");

require("dotenv").config();

const app = express();

app.use(morgan("dev"));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

const allowedOrigins = [
  "http://localhost:8000",
  "http://localhost:3000",
  "http://ssa.customadesign.info",
  "http://34.199.84.82:3000",
  "https://supersmartagents.com",
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

// Database connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to DB"))
  .catch((err) => console.log("Error connecting to DB"));

// Session configuration
app.set("trust proxy", 1);
app.use(
  session({
    secret: "your_strong_secret",
    resave: true,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: {
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production" ? true : false,
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());
const initializePassport = require("./middleware/passport");
initializePassport(passport);

// Importing and using routes
const testRoutes = require("./routes/test");
app.use("/", testRoutes);
const User = require("./routes/User");
app.use("/User", User);
const retune = require("./routes/retune");
app.use("/retune", retune);
const moonclerk = require("./routes/moonclerk");
app.use("/moonclerk", moonclerk);

const port = process.env.PORT || 8001;

app.listen(port, () =>
  console.log(`Server is running at http://localhost:${port}`)
);
