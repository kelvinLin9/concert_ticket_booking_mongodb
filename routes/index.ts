import express from "express";
// import { userController } from "../controller/index";
const router = express.Router();

router.get("/", (req, res) => {
  res.send("Welcome to Concert Ticket Booking System!");
});

// router.get("/login", userController.login);

export default router;
