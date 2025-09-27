require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const app = express();
const reviewRouter = require("./routes/Review.routes.js");
const YoutubeRoutes = require("./routes/Youtube.routes.js");
const InstagramRoutes = require("./routes/Instagram.routes.js");
const FacebookRoutes = require("./routes/Facebook.routes.js");
const TiktokRoutes = require("./routes/Tiktok.routes.js");
(express.json());
app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Routes
app.use("/api/review", reviewRouter);
app.use('/api/youtube', YoutubeRoutes);
// app.use('/api/instagram', InstagramRoutes);
app.use('/api/facebook', FacebookRoutes);
app.use('/api/tiktok', TiktokRoutes);

app.get("/", (req, res) => {
  res.send("API is running");
});

let PORT = process.env.PORT || 6050;
app.listen(PORT, () => {
  console.log(`App is running on port ${PORT}`);
});
