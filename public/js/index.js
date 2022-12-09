// Clearance on page reload
var addressbar = document.getElementById("addressbar");
var namebar = document.getElementById("namebar");
addressbar.value = ""
namebar.value = ""

var msgbar = document.getElementById("msgbar");
msgbar.value = ""

var artbar = document.getElementById("artbar");
artbar.value = ""

// Clearance on personalized prompt focus
artbar.addEventListener("focus", function() {
    document.getElementById("christmas").checked = false;
    document.getElementById("winterlandscape").checked = false;
    document.getElementById("fineart").checked = false;
    document.getElementById("nativity").checked = false;
});

// Disappearing namebar
var anoncheck = document.getElementById("anoncheck")
anoncheck.checked = false;
anoncheck.addEventListener("change", function() {
    if (anoncheck.checked) {
        namebar.value = "";
        namebar.style.display = "none";
    } else {
        namebar.style.display = "";
    }
});

// Clearing art prompt if a preselected image is generated
const descriptions = document.querySelectorAll('input[type="radio"][name="description"]');
console.log(descriptions)
descriptions.forEach(option => {
    console.log(option)
    option.addEventListener('change', function() {
      artbar.value = ""
    });
});


// Stopping user from submitting if they have not entered enough info
const gobutton = document.getElementById('gobutton');


// Returns true if the form is valid, false if it is not
function isValidForm() {
    if (!anoncheck.checked && namebar.value == "") {
        return false;
    } 
    if (addressbar.value == "") {
        return false;
    }
    var artPreselected = false;
    for (var i = 0; i < descriptions.length; i++) {
        if (descriptions[i].checked) {
          artPreselected = true;
        }
    }
    if (artbar.value == "" && !artPreselected) {
        return false;
    }
    return true;
}

// Check if the form is valid
gobutton.addEventListener("click", function(event) {
    if (!isValidForm()) {
        window.alert("Fill out the entire form!")
        event.preventDefault();
        return;
    }
    else {
        gobutton.style.display = "none";
        const subtitle = document.getElementById("subtitle");
        subtitle.innerText = "Generating a unique card! This could take up to 30 seconds"
    }
});
