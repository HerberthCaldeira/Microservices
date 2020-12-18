// server.js
// where your node app starts

// init project
var express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const randomstring = require('randomstring');
var validUrl = require('valid-url');
var app = express();

//Connection string - Add string to the .env file
let MONGO_URI = process.env.MONGO_URI;

// support parsing of application/json type post data
app.use(bodyParser.json());

//support parsing of application/x-www-form-urlencoded post data
app.use(bodyParser.urlencoded({ extended: true }));

// enable CORS (https://en.wikipedia.org/wiki/Cross-origin_resource_sharing)
// so that your API is remotely testable by FCC 
var cors = require('cors');
app.use(cors({optionsSuccessStatus: 200}));  // some legacy browsers choke on 204

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (req, res) {
  res.sendFile(__dirname + '/views/index.html');
});

app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});

//Timestamp Microservice
app.get("/timestamp", function (req, res) {
  res.sendFile(__dirname + '/views/timestamp.html');
});

app.get("/api/timestamp/", (req, res)=>{
  let date = new Date();  
  
  return res.json({
    "unix": date.getTime(), 
    "utc": date.toUTCString()
  });  
});
 
app.get("/api/timestamp/:date_string", function (req, res) {
  let dateString = req.params.date_string;
  let date = new Date(dateString);

  if (/\d{5,}/.test(dateString)) {
    dateInt = parseInt(dateString);
    res.json({ unix: dateInt, utc: new Date(dateInt).toUTCString() });
  }

  if(date.toString() === "Invalid Date"){
    res.json({"error": "Invalid Date"});
  }else{
    res.json({
      "unix": date.getTime(),
      "utc": date.toUTCString(),
      "url": "/api/timestamp/:date_string"
    })
  }

});

//Request Header Parser Mircroservice
app.get("/requestHeaderParser", function (req, res) {
  res.sendFile(__dirname + '/views/requestHeaderParser.html');
});

app.get("/api/whoami", function (req, res) {
  res.json({
    'ipaddress': req.ip,
    'language': req.headers["accept-language"],
    'software':  req.headers["user-agent"]
  });
});

//url shortener
app.get("/urlshortener", function (req, res) {
  res.sendFile(__dirname + '/views/urlShortener.html');
});

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true  });

let urlSchema = new mongoose.Schema({
  original_url: {
    type:'string',
    required : 'true'
  },
  short_url: 'string',
  suffix: 'string'
});

let url_shorterner_model = mongoose.model('urls_shortener', urlSchema);


app.post("/api/shorturl/new", async function (req, res) { 

  let url = req.body.url;
  let suffix = randomstring.generate({ 
    length: 12,
    charset: 'alphabetic' 
  });

  if ( !validUrl.isWebUri(url) ) {
    return res.status(401).json({
      error: 'invalid URL'
    });
  }else{
    let findOne = await url_shorterner_model.findOne({
      original_url: url
    });

    if(findOne){
      return res.json({
        original_url: findOne.original_url,
        short_url: findOne.short_url
      });
    }else{
      const obj_shorturl = new url_shorterner_model({
        original_url: url,
        suffix: suffix,
        short_url: __dirname +"/api/shorturl/" + suffix
      });

      await obj_shorturl.save(function (err, document) {
        if (err) return handleError(err);
        return res.json({
          original_url:document.original_url,
          short_url:document.short_url
        });         
      });
    }
  }
});

app.get("/api/shorturl/:short_url", async function (req, res) {  
  let suffix_link = req.params.short_url;
  let obj = await url_shorterner_model.findOne( {suffix: suffix_link} , function(err, data) {
    if (err) return console.log(err);   
  });

  if(obj == null){
    return res.json({error: 'invalid url'});
  }
  return res.redirect(obj.original_url);
});


// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});