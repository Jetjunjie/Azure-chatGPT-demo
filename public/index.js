// purpose: entry point of the application. It is responsible for creating the App object and passing it to the UIManager object. It also contains the event listeners for the message form and the modal form.

import App from "./App.js";
import { getCurrentUsername } from "./storage.js";
import { getAppName, getPromptRepo } from "./api.js";
import UIManager from "./UIManager.js";
import { setupVoiceInput } from "./input-audio.js";

const app = new App();
const uiManager = new UIManager(app);

const switchElement = document.getElementById("model-switch");
const modelNameElement = document.getElementById("model-name");
const switchOptions = { color: "#1AB394", secondaryColor: "#ED5565" };
const modelSwitch = new Switchery(switchElement, switchOptions);

switchElement.addEventListener("change", function () {
    app.model = this.checked ? "gpt-4" : "gpt-3.5-turbo";
    modelNameElement.textContent = this.checked ? "GPT4" : "GPT3.5";
});


const slider = document.getElementById("slider");
const currentValue = document.getElementById("currentValue");
app.prompts.onLengthChange = function (newLength) {
    slider.value = newLength - 1;
    currentValue.textContent = newLength - 1;
};

slider.addEventListener("input", function () {
    const messages = document.querySelectorAll(".message");
    const sliderValue = parseInt(slider.value, 10);
    currentValue.textContent = sliderValue;

    messages.forEach((messageElement, index) => {
        if (index >= messages.length - sliderValue) {
            messageElement.classList.add("active");
        } else {
            messageElement.classList.remove("active");
        }
    });

    // save current onLengthChange callback
    const originalOnLengthChange = app.prompts.onLengthChange;
    app.prompts.onLengthChange = null;

    app.prompts.clearExceptFirst();
    const activeMessages = document.querySelectorAll(".message.active");
    activeMessages.forEach(activeMessage => {
        app.prompts.addPrompt({ role: activeMessage.dataset.sender, content: activeMessage.dataset.message, messageId: activeMessage.dataset.messageId });
    });

    // restore onLengthChange callback
    app.prompts.onLengthChange = originalOnLengthChange;

});

const messageForm = document.querySelector("#message-form");
const messageInput = document.querySelector("#message-input");
const clearInput = document.getElementById("clear-input");
clearInput.addEventListener("click", function () {
    messageInput.value = "";
});

const exportExcel = document.querySelector("#export-excel");

// get and set page title and header h1 text from /api/app-name
const pageTitle = document.querySelector("title");
const headerH1 = document.querySelector("#header h1");
// /api/app-name will return the app name from .env file
getAppName()
    .then(appName => {
        pageTitle.innerText = appName;
        headerH1.innerText = appName;
    });

// 获取模态对话框元素和触发器元素
const modal = document.querySelector(".modal");
const usernameLabel = document.querySelector("#username-label");
const userForm = document.querySelector("#user-form");
const usernameInput = document.querySelector("#username-input");

// get tts container element
const ttsContainer = document.querySelector("#tts-container");
ttsContainer.style.display = "none";

const practiceMode = document.querySelector("#practice-mode");

// add click event listener to practiceMode
practiceMode.addEventListener("click", () => {
    // if ttsPracticeMode is false, then set it to true
    if (!app.ttsPracticeMode) {
        uiManager.turnOnPracticeMode();
    } else {
        uiManager.turnOffPracticeMode();
        // reset all the speaker icon to fas fa-volume-off
        // so that if the speaker is broken, it will can be clicked again
        const speakerElements = document.querySelectorAll(".message-speaker");
        speakerElements.forEach(speakerElement => {
            speakerElement.classList.remove("fa-volume-up");
            speakerElement.classList.add("fa-volume-off");
        });
    }
});

// add click event listener to exportExcel
exportExcel.addEventListener("click", () => {
    // get all the messages
    const messages = document.querySelectorAll(".message");
    // get the conversion from each message element's data-message attribute
    const conversions = [];
    messages.forEach(message => {
        conversions.push({ sender: message.dataset.sender, message: message.dataset.message });
    });

    // convert the conversion array to csv string
    const convertToCSV = (objArray) => {
        var array = typeof objArray != "object" ? JSON.parse(objArray) : objArray;
        var str = "";

        for (var i = 0; i < array.length; i++) {
            var line = "";
            for (var index in array[i]) {
                if (line != "") line += ",";
                line += "\"" + array[i][index].replace(/"/g, "\"\"") + "\"";
            }
            str += line + "\r\n";
        }

        return str;
    };

    let csv = convertToCSV(conversions);

    // create a hidden link element
    const link = document.createElement("a");
    link.style.display = "none";
    // set the href attribute to the csv string
    link.setAttribute("href", "data:text/csv;charset=utf-8," + encodeURIComponent(csv));
    // set the download attribute to the file name
    // set file name to azure_gpt_conversations + current date time
    const date = new Date();
    const fileName = "azure_gpt_conversations_" + date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + "_" + date.getHours() + "-" + date.getMinutes() + ".csv";
    link.setAttribute("download", fileName);
    // append the link element to the body
    document.body.appendChild(link);
    // click the link element
    link.click();
    // remove the link element from the body
    document.body.removeChild(link);
});

// generate current user menulist and render it
getPromptRepo(getCurrentUsername())
    .then(data => {
        uiManager.renderMenuList(data);
    })
    .catch(error => {
        console.error("Error:", error);
    });


// Send message on form submit
messageForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const message = messageInput.value.trim();
    if (message) {
        uiManager.sendMessage(message);
    }
    messageInput.blur();
});


// request /api/prompt_repo build queryString to transfer usernameInput value as username to server
// it will return a json object with username and a data array
// output the data array and the username in console
userForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const username = usernameInput.value.trim();
    modal.style.display = "none";
    if (username) {
        getPromptRepo(username)
            .then(data => {
                uiManager.renderMenuList(data);
                //practice mode will be off when user submit the username
                uiManager.turnOffPracticeMode();
            });
    }
});

// popup the modal when user click the username label
usernameLabel.addEventListener("click", function () {
    modal.style.display = "block";
});

// close the modal when user click the close button
document.addEventListener("click", function (event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
});

// handle the click event on the ai profile
function handleProfileClick() {
    const aiProfile = document.getElementById("ai-profile");
    const menu = document.getElementById("menu");

    // Remove the click event listener from ai-profile
    aiProfile.removeEventListener("click", handleClick);

    if (window.innerWidth <= 768) {
        // Add the click event listener to ai-profile for smaller screens
        aiProfile.addEventListener("click", handleClick);

        // Make sure the menu is hidden initially on smaller screens
        menu.style.display = "none";
        menu.setAttribute("data-visible", false);
    } else {
        // Make the menu visible and remove the click event listener for larger screens
        menu.style.display = "block";
        menu.setAttribute("data-visible", true);
    }
}


// handle the click event on the ai profile
function handleClick(event) {
    event.stopPropagation();
    toggleMenu();
}

document.addEventListener("DOMContentLoaded", handleProfileClick);
window.addEventListener("resize", handleProfileClick);

// toggle the menu when user click the ai profile
function toggleMenu() {
    const menu = document.getElementById("menu");
    const isVisible = menu.getAttribute("data-visible") === "true";

    menu.style.display = isVisible ? "none" : "block";
    menu.setAttribute("data-visible", !isVisible);

    if (!isVisible) {
        document.addEventListener("click", function hideMenuOnOutsideClick(event) {
            const aiProfile = document.getElementById("ai-profile");

            if (event.target !== menu && event.target !== aiProfile && !aiProfile.contains(event.target)) {
                menu.style.display = "none";
                menu.setAttribute("data-visible", false);
                document.removeEventListener("click", hideMenuOnOutsideClick);
            }
        });
    }
}

setupVoiceInput(uiManager);