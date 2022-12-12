// A regular expression for all possible valid emails
const emailRegex = /^[-!#$%&'*+\/0-9=?A-Z^_a-z{|}~](\.?[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/;

// Checks using a regex whether some email uses only valid chars and is the correct length
// Returns true or false depending on validity
function isValidEmail(email) {
    if (email.length > 254) { return false };
    if (!emailRegex.test(email)) { return false };
    var parts = email.split("@");
    if (parts[0].length > 64) { return false };
    var domainParts = parts[1].split(".");
    if (domainParts.some(function(part) { return part.length > 63; })) { return false };
    return true;
}

var sendbutton = document.getElementById("sendbutton")

// Check if the form is valid
sendbutton.addEventListener("click", function(event) {
    let email = document.getElementById('email').value.toLowerCase()
    
    if (!isValidEmail(email)) {
        window.alert("Make sure you've got the right email!")
        event.preventDefault();
        return;
    } else {
        sendbutton.style.display = "none";
    }
    
});