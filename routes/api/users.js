const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
require("dotenv").config();
//const keys = require("../../config/keys.js.old");
const verify = require("../../utilities/verify-token");
const validateRegisterInput = require("../../validation/register");
const validateLoginInput = require("../../validation/login");
const User = require("../../models/User");

router.get("/", (req, res) => {
  try {
    let jwtUser = jwt.verify(verify(req), process.env.secretOrKey);
    let id = mongoose.Types.ObjectId(jwtUser.id);
    console.log(jwtUser.id);

    User.aggregate()
      .match({ _id: { $not: { $eq: id } } })
      .project({
        password: 0,
        __v: 0,
        date: 0,
      })
      .exec((err, users) => {
        if (err) {
          console.log(err);
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ message: "Failure" }));
          res.sendStatus(500);
        } else {
          res.send(users);
        }
      });
  } catch (err) {
    console.log(err);
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ message: "Unauthorized" }));
    res.sendStatus(401);
  }
});

router.post("/register", (req, res) => {
  // Form Validation
  const { errors, isValid } = validateRegisterInput(req.body);

  // Check Validation
  if (!isValid) {
    return res.status(400).json(errors);
  }

  User.findOne({ username: req.body.username }).then((user) => {
    if (user) {
      return res.status(400).json({ message: "Username already exists" });
    } else {
      const newUser = new User({
        name: req.body.name,
        username: req.body.username,
        password: req.body.password,
      });
      // Hash Password using bcrypt before saving to database
      bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(newUser.password, salt, (err, hash) => {
          if (err) throw err;
          newUser.password = hash;
          newUser
            .save()
            .then((user) => {
              const payload = {
                id: user.id,
                name: user.name,
              };
              // Sign Token
              jwt.sign(
                payload,
                process.env.secretOrKey,
                {
                  expiresIn: 31556926, // Number of Seconds in 1 Year
                },
                (err, token) => {
                  if (err) {
                    console.log(err);
                  } else {
                    req.io.sockets.emit("users", user.username);
                    res.json({
                      success: true,
                      token: "Bearer " + token,
                      name: user.name,
                    });
                  }
                }
              );
            })
            .catch((err) => console.log(err));
        });
      });
    }
  });
});

router.post("/login", (req, res) => {
  // Form Validation
  const { errors, isValid } = validateLoginInput(req.body);
  // Check Validation
  if (!isValid) {
    return res.status(400).json(errors);
  }
  const username = req.body.username;
  const password = req.body.password;

  // Find User by username
  User.findOne({ username }).then((user) => {
    // Check if the User Exists
    if (!user) {
      return res.status(404).json({ usernamenotfound: "Username not found" });
    }
    // Check Password
    bcrypt.compare(password, user.password).then((isMatch) => {
      if (isMatch) {
        // User Matched
        // Create JWT Payload
        const payload = {
          id: user.id,
          name: user.name,
        };
        // Sign Token
        jwt.sign(
          payload,
          process.env.secretOrKey,
          {
            expiresIn: 31556926, // Number of Seconds in 1 Year
          },
          (err, token) => {
            res.json({
              success: true,
              token: "Bearer " + token,
              name: user.name,
              username: user.username,
            });
          }
        );
      } else {
        return res
          .status(400)
          .json({ passwordincorrect: "Password incorrect" });
      }
    });
  });
});

module.exports = router;
