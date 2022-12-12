/*------------SETUP------------*/
const express = require('express');

require("dotenv").config(); // Get .env file

const app = express(); // Start up the express server!
const port = 3000; // Which port are we listening for requests on?

const crypto = require('crypto'); // For no-collision formatting of image names

// For emailing Christmas cards on request
// Mails from hello@alphajot.com
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
    name: 'Alphajot',
    host: process.env.EMAIL_HOST,
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    },
    tls: {
        rejectUnauthorized: false
    }
});

// For reading information from client
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));

// What information is public?
app.use(express.static(__dirname + '/public')); 

/*------------APIs------------*/

// GPT-3 (OpenAI)
const axios = require('axios'); // Import the axios library to make HTTP requests
const GPTClient = axios.create({
    headers: {'Authorization': 'Bearer ' + process.env.GPT_KEY}
});

// DALL-E 2 (OpenAI)
const openai = require('openai');
const configuration = new openai.Configuration({
	apiKey: process.env.DALLE_KEY,
});
const DALLEClient = new openai.OpenAIApi(configuration);

// ImageKit
var ImageKit = require('imagekit')
var imagekit = new ImageKit({
    publicKey : process.env.IMAGEKIT_PUBLIC,
    privateKey : process.env.IMAGEKIT_PRIVATE,
    urlEndpoint : "https://ik.imagekit.io/alphajot/"
});

/*------------LANDING------------*/

// When someone first visits the website, what page do we send them?
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

/*------------SAVING IMAGE TO IMGKIT------------*/

// Saves an image from a given URL to the ImageKit platform and returns the resulting URL
async function saveImage(imageUrl) {
    return new Promise((resolve, reject) => {
        try {
            const hash = crypto.createHash('sha512');
            hash.update(imageUrl);
            const sha512 = hash.digest('hex').toString();
            imagekit.upload({
                file: imageUrl,
                fileName: sha512 + ".png",
            }, function (error, result) {
                if (error) {
                    console.log(error);
                    reject(error);
                } else {
                    console.log(result);
                    resolve(result.url);
                }
            });
        } catch {
            reject(error);
        }
    });
}

/*------------EMAIL OPERATIONS------------*/

// A regular expression for all possible valid emails
const emailRegex = /^[-!#$%&'*+\/0-9=?A-Z^_a-z{|}~](\.?[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/;

// Checks using a regex whether some email uses only valid chars and is the correct length
// Returns true or false according to validity
function isValidEmail(email) {
    if (email.length > 254 || !emailRegex.test(email)) { return false };
    var parts = email.split("@");
    if (parts[0].length > 64) { return false };
    var domainParts = parts[1].split(".");
    return (!domainParts.some(function(part) { return part.length > 63; }));
}

// Uses GPT-3 to write the subject line for the emailed Christmas card
// Returns subject as a string
async function generateSubject(text) {
    const params = {
        model: "text-davinci-003",
        prompt: "Write a short subject line for an email with the following text: " + text.replace(/<\/?p>/g, "\n") + ". Subject: ",
        temperature: 0.5,
        max_tokens: 20,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
    }
    // Post to OpenAI's GPT-3 API and return the message
    const result = await GPTClient.post("https://api.openai.com/v1/completions", params);
    console.log(result.data.choices[0].text)
    return result.data.choices[0].text;
}

// Sends to the requested email from hello@alphajot.com, containing appropraite image and text
async function sendEmail(email, image, text) {

    const mailConfigurations = {
        from: 'Alphajot hello@alphajot.com',
        to: email,
        subject: await (generateSubject(text) || "Merry Christmas!"),
        html: '<html><body><img class="card" style="font-family: Rockwell; width: 80%; aspect-ratio: 1; max-width: 600px; background-color: #FFFFFF; border-radius: 10px; box-shadow: 0px 5px 15px #666666; margin: auto; padding: 20px; display: flex; align-items: center; justify-content: center;" src="' + image + '"><br>'
        + '<div class="card" style="font-family: Rockwell; width: 80%; aspect-ratio: 1; max-width: 600px; background-color: #FFFFFF; border-radius: 10px; box-shadow: 0px 5px 15px #666666; margin: auto; padding: 20px; display: flex; align-items: center; justify-content: center;"><div class="greeting" style="width: 80%; font-size: x-large; font-weight: bold; margin-bottom: 15px;">'
        + '<p>' + text + '</p>'
        + '<p class="attribution" style="font-size: x-small; font-weight: normal;">Art and text produced by an AI at Alphajot.com</p></div></div>'
        + '</body></html>'
    };

    transporter.sendMail(mailConfigurations, function(error, info){
        if (error) throw Error(error);
        console.log('Email Sent Successfully');
        console.log(info);
    });
    
}

/*------------CARD GENERATION------------*/

// Uses GPT-3 to create a final prompt for DALL-E 2
// Prompts DALL-E and returns temporary link to the DALLE-generated art
async function finalizeArt(artprompt) {

    // Determine metaprompt depending on artprompt
    var metaprompt;
    switch (artprompt) {
        case "christmas":
            metaprompt = "Write a brief idea for some Christmas card art, possibly including Santa Claus, Christmas trees, or reindeer:";
            break;
        case "winterlandscape":
            metaprompt = "Write a brief idea for a beautiful winter landscape painting:";
            break;
        case "fineart":
            metaprompt = "Write a brief idea for a beautiful example of fine art painting:";
            break;
        case "nativity":
            metaprompt = "Write a brief idea for an image depiction of the nativity scene and its medium:";
            break;
        default:
            metaprompt = "Write an brief idea for an image, described as: " + artprompt;
    }

    // Post to OpenAI's GPT-3 API to generate the prompt for DALL-E 2
    var prompt = "";
    const params = {
        model: "text-davinci-003",
        prompt: metaprompt,
        temperature: 0.7,
        max_tokens: 100,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
    }
    try {
        const result = await GPTClient.post("https://api.openai.com/v1/completions", params);
        prompt = result.data.choices[0].text
    } catch {
        prompt = artprompt + ", a detailed painting"
    }

    // Enhance DALL-E prompt based on default art prompt
    switch (artprompt) {
        case "christmas":
            prompt += ", christmas card art";
            break;
        case "winterlandscape":
            prompt += ", detailed painting";
            break;
        case "fine art":
            prompt += ", fine art painting";
            break;
        default:
            if (artprompt != "nativity") {
                prompt += ", " + artprompt;
            }
    }
    
    // Log final prompt
    console.log("\nIMAGE PROMPT: " + prompt)

    // Post to DALL-E 2 and return the short-term URL
    // Returns the example image if there is an error
    try {
        const response = await DALLEClient.createImage({
            prompt: prompt,
            n: 1,
            size: "512x512",
        });
        image_url = response.data.data[0].url;
        return image_url;
    } catch {
        console.log("AI Image Generation Error!")
        return "https://alphajot.com/images/example.png"
    }
    
}

// Generates a Christmas greeting message for a specified recipient, from a specified sender 
// Uses OpenAI's GPT-3 model
// Returns a the message as a string
async function finalizeMessage(msgprompt, recipient, sender) {

    var prompt = "Write brief, unique text for a Christmas greeting card to " + recipient + ". "
                + "Details: should be \"" + msgprompt + "\". "

    if (sender != "") {
        prompt += "Name of sender: " + sender + "."
    } else {
        prompt += "From an anonymous sender."
    }

    console.log("PROMPT: " + prompt)

    const params = {
        model: "text-davinci-003",
        prompt: prompt,
        temperature: 0.7,
        max_tokens: 100,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
    }

    // Post to OpenAI's GPT-3 API and return the message
    const result = await GPTClient.post("https://api.openai.com/v1/completions", params);
    var message = result.data.choices[0].text

    while (message[0] == "\n") {
        message = message.slice(1)
    }

    return message;

}

/*------------RESULT PAGE------------*/

// Formats a string into a group of HTML paragraphs for display in a virtual Christmas card
function formatToHTML(message) {

    var rebuilt = "";

    // Replace newlines with alternative open and close paragraph tags
    // Eliminates double quotes
    var closetag = false;
    for (i in message) {
        if (message[i] == "\n") { 
            if (closetag) { 
                rebuilt += "</p>"
                closetag = false;
            } else { 
                rebuilt += "<p>"
                closetag = true;
            }
        } else if (message[i] != '"') {
            rebuilt += message[i]
        }
    }

    return rebuilt;
}

// Format image and text into an HTML result page, which it then returns
function formatResult(imageUrl, message) {    
    return '<!DOCTYPE html><html><head><title>New Card</title><meta charset="UTF-8"/>' 
            + '<meta name="viewport" content="width=device-width,initial-scale=1"/><link rel = "stylesheet" type = "text/css" href = "css/stylesheet.css">'
            + '</head><body><div><h1><a href="/" style="text-decoration: none; color: black;">Alphajot</a></h1></div>'
            + '<form action="/ConfirmCard" method="post"><img class="card" src="' + imageUrl + '"><br>'
            + '<div class="card"><div class="greeting">'
            + '<p>' + message + '</p>'
            + '<p class="attribution">Art and text produced by an AI at Alphajot.com</p></div></div>'
            + '<br><br><div><input class="emailbar" name="email" placeholder="Recipient Email Address"><br><br><button id="sendbutton" class="sendbutton" type="submit">Send!</button><p class="attribution">'
            + '<input style="display: none;" name="img" value="' + imageUrl + '"><input style="display: none;" name="msg" value="' + message + '"></div>'
            + '</form><script src="js/validate.js"></script></body></html>'
}

/*------------LOGS------------*/

// Logs information about the card prompts before completion by AI
function logCardRequest(artprompt, msgprompt, sender) {
    console.log("---NEW CARD REQUEST---")
    console.log("ART THEME: " + artprompt);
    console.log("MESSAGE THEME: " + msgprompt)
    console.log("ANONYMOUS?: " + (sender == "") + "\n")
}

// Logs information about the card prompts after completion by AI 
function logCardResult(imageUrl, message) {
    console.log("---CARD CREATED---")
    console.log("ART LINK: " + imageUrl);
    console.log("\nMESSAGE TEXT:\n" + message + "\n\nArt and text produced by an AI at Alphajot.com")
}

/*------------CARD CREATION------------*/

// A card creation request
// Returns the viewing screen for the new card
app.post('/CreateCard', async (req, res) => {

    // Collect prompt for art
    var artprompt = req.body.artprompt || req.body.description || "traditional christmas scene";

    // Collect prompt for message
    var msgprompt = req.body.msgprompt != "" ? req.body.theme + ", " + req.body.msgprompt : req.body.theme;

    // Collect names
    var recipient = (req.body.recipient || "all the sender's friends");
    var sender = req.body.anoncheck == "on" ? "" : req.body.sender;

    // Log the new request
    logCardRequest(artprompt, msgprompt, sender);

    // Finalize the art and text in parallel 
    var [imageUrl, message] = await Promise.all([
        finalizeArt(artprompt),
        finalizeMessage(msgprompt, recipient, sender)
    ]);
    message = formatToHTML(message); // Add HTML paragraphs to the message to make it look nicer

    // Log the result of the new card request
    logCardResult(imageUrl, message);

    // Return the completed card to the client
    return res.send(formatResult(imageUrl, message));

});

// A card confirmation request
// Emails the card to the input email
// Returns the success or failure screen according to outcome 
app.post('/ConfirmCard', async (req, res) => {

    // Get email and convert it to lower case
    let email = req.body.email.toLowerCase(); 

    // Check if email is valid
    if (!isValidEmail(email)) {
        // Return failure page if email is invalid
        return res.sendFile(__dirname + "/public/failure.html")
    }

    // Log the requested email
    console.log("\nREQUESTED SEND TO: " + email);

    try {
        // Save the image
        const img = await saveImage(req.body.img);
    
        // Log the saved image
        console.log(img)
    
        // Send the email with the image and message
        sendEmail(email, img, req.body.msg);
    
        // Return success page
        res.sendFile(__dirname + "/public/success.html");
    } catch {
        // Return failure page if there is an error
        return res.sendFile(__dirname + "/public/failure.html")
    }

})


/*------------LISTENING------------*/
// When the app is first booted up, what does it do?
// Listens for instructions
// Connects to the database
app.listen(process.env.PORT || port, async () => {
    console.log("Alphajot server running...");
});