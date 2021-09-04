require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const dns = require('dns');

const Shortner = require("./mongo_schema");

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.urlencoded({extended: false}));

app.use('/public', express.static(`${process.cwd()}/public`));

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: "true",
}).then(() => console.log("connected"));



app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.post('/api/shorturl', async (req, res, next) => {
  const original_url = req.body.url;

  // Check if it's not a valid url
  if(!/^(http|https):\/\//.test(original_url)){
    return next(new Error("invalid url"))
  }

  // Check DNS
  const domain = original_url.match(/(\w|-)+(\[\w]{3,5})/g);
  if(domain){
    await dns.lookup(domain[0], (err, address, family) => {
            if(err) return next(err);
          })
  }
    
  
  // Check if this url exists
  const existsDoc = await Shortner.findOne({original_url});
  if(existsDoc){
    return res.json({ original_url: existsDoc.original_url, short_url: existsDoc.short_url });
  }

  //Create and save to db
  try{
    //Get the last inserted doc
    const latestShortUrl = await Shortner.find({}).sort({short_url: "desc"}).limit(1);
    // if there is at least 1 doc, get the short_url prop and update by 1 otherwise set to 1.
    const newShortUrl = latestShortUrl.length > 0 ? latestShortUrl[0]["short_url"]+1 : 1
    const shortnerUrl = new Shortner({ original_url, short_url: newShortUrl});
    const savedDoc = await shortnerUrl.save()
    // return json response if created
    res.json({ original_url: savedDoc.original_url, short_url: savedDoc.short_url });
  } catch(err) {
    next(err)
  }
});

app.get("/api/shorturl/:shorturl", async (req, res, next) => {
  const {shorturl} = req.params;
  try{
    const doc = await Shortner.findOne({short_url: shorturl});
    if(!doc) return next(new Error("No short URL found for the given input"))
    const {original_url} = doc;
    res.redirect(301, original_url);
  } catch(err){
    return next(err)
  }
  
})

app.use((err, req, res, next) => {
  if(err.code === "ENOTFOUND"){
    return res.json({error: "Invalid hostname"})
  }
  return res.status(200).json({error: err.message});
})

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
