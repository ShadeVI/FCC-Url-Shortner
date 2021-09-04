const mongoose = require("mongoose");

const shortnerSchema = new mongoose.Schema({
    original_url: String,
    short_url: Number,
});

const Shortner = mongoose.model("Shortner", shortnerSchema);

module.exports = Shortner;
