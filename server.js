const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();
const bodyParser = require("body-parser");
const passport = require("passport");
const cors = require("cors");
const users = require("./routes/api/users");
const messages = require("./routes/api/messages");
const app = express();
const PORT = 5000;
// Declare a Server Object (interface), Start the Server
mongoose.connect(
  `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0-8y1wq.mongodb.net/mern-auth-mongo?retryWrites=true&w=majority`,
  { useNewUrlParser: true, useFindAndModify: true },
  (err) => {
    if (err) throw err;
    console.log("MongoDB Connected Successfully...");
  }
);
const server = app.listen(PORT, () => {
  console.log(`Server Running on port ${PORT}`);
});
// Declare a Socket Object
const io = require("socket.io").listen(server);
// Body Parser Middleware to Parse Request Bodies
app.use(
  bodyParser.urlencoded({
    extended: false,
  })
);
// Use bodyParser
app.use(bodyParser.json());
// Use CORS Middleware
app.use(cors());
// Database Configuration (original)
// const db = require("./config/keys").mongoURI;
// mongoose
//   .connect(db, { useNewUrlParser: true, useFindAndModify: true })
//   .then(() => console.log("MongoDB Connected to Chain Gang Chat"))
//   .catch((err) => console.log(err));

// Use Passport Middleware
app.use(passport.initialize());
// Passport config
require("./config/passport")(passport);
// Assign a Socket Object to Every Request
app.use(function (req, res, next) {
  req.io = io;
  next();
});

// Routes
app.use("/api/users", users);
app.use("/api/messages", messages);
