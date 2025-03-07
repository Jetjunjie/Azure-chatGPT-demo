/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
import { setCurrentUsername, getCurrentUsername, getCurrentProfile, setCurrentProfile, saveMessages, getMessages } from "./storage.js";
import { getGpt, getTts, textToImage } from "./api.js";

// purpose to manage the ui interaction of the app
class UIManager {

    constructor(app) {
        this.app = app;
        this.messageLimit = 10;
        const messagesContainer = document.querySelector("#messages");
        messagesContainer.addEventListener("scroll", () => {
            if (messagesContainer.scrollTop === 0) {
                this.loadMoreMessages();
            }
        });
    }

    // generate unique id
    generateId() {
        return Math.random().toString(36).slice(2, 10);
    }

    showToast(message) {
        var toast = document.getElementById("toast");
        toast.innerHTML = message;
        toast.style.display = "block";
        setTimeout(function () {
            toast.style.display = "none";
        }, 3000);
    }

    // attach speaker event to message speaker
    attachMessageSpeakerEvent(speaker) {
        if (!speaker) {
            return;
        }
        speaker.addEventListener("click", async () => {
            await this.playMessage(speaker);
        });
    }

    turnOnPracticeMode() {
        const practiceMode = document.querySelector("#practice-mode");
        const practiceModeIcon = document.querySelector("#practice-mode-icon");
        practiceMode.innerText = "Auto";
        practiceModeIcon.classList.remove("fa-volume-off");
        practiceModeIcon.classList.add("fa-volume-up");
        this.app.setTtsPracticeMode(true);
    }


    turnOffPracticeMode() {
        const practiceMode = document.querySelector("#practice-mode");
        const practiceModeIcon = document.querySelector("#practice-mode-icon");
        practiceMode.innerText = "Man.";
        practiceModeIcon.classList.remove("fa-volume-up");
        practiceModeIcon.classList.add("fa-volume-off");
        this.app.setTtsPracticeMode(false);
    }

    // Create a new method for creating the conversation element
    createConversationElement() {
        const conversationElement = document.createElement("i");
        conversationElement.classList.add("fas");
        conversationElement.classList.add("fa-quote-left");
        return conversationElement;
    }

    // Create a new method for creating the delete element
    createDeleteElement() {
        const deleteElement = document.createElement("i");
        deleteElement.classList.add("message-delete");
        deleteElement.classList.add("fas");
        deleteElement.classList.add("fa-times");
        return deleteElement;
    }

    // Create a new method for creating the icon group
    createIconGroup() {
        const iconGroup = document.createElement("div");
        iconGroup.classList.add("icon-group");
        return iconGroup;
    }

    // Create a new method for creating the copy element
    createCopyElement() {
        const copyElement = document.createElement("i");
        copyElement.classList.add("message-copy");
        copyElement.classList.add("fas");
        copyElement.classList.add("fa-copy");
        return copyElement;
    }

    // Create a new method for creating the speaker element
    createSpeakerElement() {
        const speakerElement = document.createElement("i");
        speakerElement.classList.add("message-speaker");
        speakerElement.classList.add("fas");
        speakerElement.classList.add("fa-volume-off");
        return speakerElement;
    }

    // Create a new method for creating the message element
    createMessageElement(sender, messageId, isActive) {
        const messageElement = document.createElement("div");
        messageElement.classList.add("message");
        messageElement.classList.add(`${sender}-message`);
        messageElement.dataset.sender = sender;
        messageElement.dataset.messageId = messageId;

        if (isActive) {
            messageElement.classList.add("active");
        }

        return messageElement;
    }

    // Create a new method for creating the message content element
    createMessageContentElement(sender, message, isActive) {
        if (sender === "user") {
            const pre = document.createElement("pre");
            pre.innerText = isActive ? message : this.getMessagePreview(message); // Set full text if active, else set preview text
            return pre;
        } else {
            const messageHtml = marked.parse(message);
            const messageHtmlElement = document.createElement("div");
            messageHtmlElement.innerHTML = isActive ? messageHtml : marked.parse(this.getMessagePreview(message)); // Set full text if active, else set preview text
            return messageHtmlElement;
        }
    }

    toggleActiveMessage(event) {
        // Get the messageElement based on event type
        const messageElement = event.currentTarget.parentElement;

        // check if the element has class active
        if (messageElement.classList.contains("active")) {
            // if it has, remove the inactive class
            messageElement.classList.remove("active");
            // remove the message frmo prompts by message id
            const messageId = messageElement.dataset.messageId;
            this.app.prompts.removePrompt(messageId);
        } else {
            // if it doesn't, add the inactive class
            messageElement.classList.add("active");
            // clear prompts except index 0
            this.app.prompts.clearExceptFirst();
            // add all the active messages to prompts
            const activeMessages = document.querySelectorAll(".message.active");
            activeMessages.forEach(activeMessage => {
                this.app.prompts.addPrompt({ role: activeMessage.dataset.sender, content: activeMessage.dataset.message, messageId: activeMessage.dataset.messageId });
            });
        }
    }

    // Create a new method for attaching a toggle active message event listener
    attachToggleActiveMessageEventListener(element) {
        element.addEventListener("click", this.toggleActiveMessage.bind(this));
    }

    // Create a new method for attaching a delete message event listener
    attachDeleteMessageEventListener(element) {
        element.addEventListener("click", () => {
            const messageId = element.parentElement.dataset.messageId;
            this.deleteMessage(messageId);
        });
    }

    // Add this method to attach a retry message event listener
    attachRetryMessageEventListener(retryElement, messageId) {
        retryElement.addEventListener("click", async () => {
            await this.retryMessage(messageId);
        });
    }

    // Add this method to create a retry element
    createRetryElement() {
        const retryElement = document.createElement("i");
        retryElement.className = "fas fa-sync-alt message-retry";
        return retryElement;
    }

    // Add this method to handle retrying a message
    async retryMessage(messageId) {
        const messageElem = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageElem) {
            const messageContent = messageElem.dataset.message;
            this.app.prompts.removePrompt(messageId);
            //add active class to message if it is not already active
            if (!messageElem.classList.contains("active")) {
                messageElem.classList.add("active");
            }
            await this.sendMessage(messageContent, true);
        }
    }

    //text to image
    async generateImage(caption) {
        try {
            const data = await textToImage(caption);
            const imageUrl = data.imageUrl;
            const messageId = this.generateId();
            // Set width and height attributes for the image
            const thumbnailWidth = 300;
            const thumbnailHeight = 300;
            // Wrap the <img> tag and caption text in a <div>
            this.addMessage(
                "assistant",
                `<div>
           <img src="${imageUrl}" alt="${caption}" width="${thumbnailWidth}" height="${thumbnailHeight}" style="object-fit: contain;" />
           <p style="margin-top: 4px;">${caption}</p>
         </div>`,
                messageId
            );
            this.saveCurrentProfileMessages();
        } catch (error) {
            console.error(error);
            let messageId = this.generateId();
            this.addMessage("assistant", error.message, messageId);
        }
    }

    // Add message to DOM
    addMessage(sender, message, messageId, isActive = true) {
        const messageElement = this.createMessageElement(sender, messageId, isActive);
        messageElement.dataset.message = message;

        if (sender !== "system") {
            const conversationElement = this.createConversationElement();
            messageElement.appendChild(conversationElement);
            this.attachToggleActiveMessageEventListener(conversationElement);

            const deleteElement = this.createDeleteElement();
            messageElement.appendChild(deleteElement);
            this.attachDeleteMessageEventListener(deleteElement);
        }

        const messageContentElement = this.createMessageContentElement(sender, message, isActive);
        messageElement.appendChild(messageContentElement);

        if (!isActive) {
            messageElement.classList.add("collapsed");
        }


        const messageElem = messageElement; // Add this line to save the reference to messageElement

        messageElement.addEventListener("dblclick", (event) => { // Change to dblclick event

            // If the time difference between the last click and this click is less than the threshold, treat it as a double click event
            const isCollapsed = messageElem.classList.toggle("collapsed"); // Use messageElem instead of this and toggle "collapsed" class

            if (!isCollapsed) {
                // Show full message when expanded
                if (sender === "user") {
                    messageElem.querySelector("pre").innerText = messageElem.dataset.message;
                } else {
                    messageElem.querySelector("div").innerHTML = marked.parse(messageElem.dataset.message);
                }
            } else {
                // Show preview text when collapsed
                if (sender === "user") {
                    messageElem.querySelector("pre").innerText = this.getMessagePreview(messageElem.dataset.message);
                } else {
                    messageElem.querySelector("div").innerHTML = marked.parse(this.getMessagePreview(messageElem.dataset.message));
                }
            }

        });

        const iconGroup = this.createIconGroup();

        const copyElement = this.createCopyElement();
        iconGroup.appendChild(copyElement);

        if (sender === "user") {
            const retryElement = this.createRetryElement();
            iconGroup.appendChild(retryElement);
            this.attachRetryMessageEventListener(retryElement, messageId);
        }


        if (getCurrentProfile() && getCurrentProfile().tts === "enabled") {
            const speakerElement = this.createSpeakerElement();
            iconGroup.appendChild(speakerElement);
        }

        messageElement.appendChild(iconGroup);
        const messagesContainer = document.querySelector("#messages");
        messagesContainer.appendChild(messageElement);

        const currentSpeaker = messageElement.querySelector(".message-speaker");
        this.attachMessageSpeakerEvent(currentSpeaker);

        const autoPlay = this.app.ttsPracticeMode && sender === "assistant";
        if (autoPlay) {
            this.playMessage(currentSpeaker);
        }

        const currentCopy = messageElement.querySelector(".message-copy");
        this.attachMessageCopyEvent(currentCopy);

        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        this.updateSlider();

    }

    // Add message to DOM
    addMessageToTop(sender, message, messageId, isActive = true) {
        const messageElement = this.createMessageElement(sender, messageId, isActive);
        messageElement.dataset.message = message;

        if (sender !== "system") {
            const conversationElement = this.createConversationElement();
            messageElement.appendChild(conversationElement);
            this.attachToggleActiveMessageEventListener(conversationElement);

            const deleteElement = this.createDeleteElement();
            messageElement.appendChild(deleteElement);
            this.attachDeleteMessageEventListener(deleteElement);
        }

        const messageContentElement = this.createMessageContentElement(sender, message, isActive);
        messageElement.appendChild(messageContentElement);

        if (!isActive) {
            messageElement.classList.add("collapsed");
        }


        const messageElem = messageElement; // Add this line to save the reference to messageElement

        messageElement.addEventListener("dblclick", (event) => { // Change to dblclick event

            // If the time difference between the last click and this click is less than the threshold, treat it as a double click event
            const isCollapsed = messageElem.classList.toggle("collapsed"); // Use messageElem instead of this and toggle "collapsed" class

            if (!isCollapsed) {
                // Show full message when expanded
                if (sender === "user") {
                    messageElem.querySelector("pre").innerText = messageElem.dataset.message;
                } else {
                    messageElem.querySelector("div").innerHTML = marked.parse(messageElem.dataset.message);
                }
            } else {
                // Show preview text when collapsed
                if (sender === "user") {
                    messageElem.querySelector("pre").innerText = this.getMessagePreview(messageElem.dataset.message);
                } else {
                    messageElem.querySelector("div").innerHTML = marked.parse(this.getMessagePreview(messageElem.dataset.message));
                }
            }

        });

        const iconGroup = this.createIconGroup();

        const copyElement = this.createCopyElement();
        iconGroup.appendChild(copyElement);

        if (sender === "user") {
            const retryElement = this.createRetryElement();
            iconGroup.appendChild(retryElement);
            this.attachRetryMessageEventListener(retryElement, messageId);
        }


        if (getCurrentProfile() && getCurrentProfile().tts === "enabled") {
            const speakerElement = this.createSpeakerElement();
            iconGroup.appendChild(speakerElement);
        }

        messageElement.appendChild(iconGroup);
        const messagesContainer = document.querySelector("#messages");
        messagesContainer.insertBefore(messageElement, messagesContainer.firstChild.nextSibling);

        const currentSpeaker = messageElement.querySelector(".message-speaker");
        this.attachMessageSpeakerEvent(currentSpeaker);

        const autoPlay = this.app.ttsPracticeMode && sender === "assistant";
        if (autoPlay) {
            this.playMessage(currentSpeaker);
        }

        const currentCopy = messageElement.querySelector(".message-copy");
        this.attachMessageCopyEvent(currentCopy);

        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        this.updateSlider();

    }

    updateSlider() {
        const messageCount = document.querySelectorAll(".message").length - 1;
        document.querySelector("#maxValue").textContent = messageCount;

        const counversationCount = this.app.prompts.length - 1;
        //slider.max will be 10 or the number of messages in the conversation, whichever is greater
        const maxSliderValue = Math.max(10, counversationCount);
        const slider = document.querySelector("#slider");
        slider.max = maxSliderValue;
    }

    getMessagePreview(message) {
        const maxLength = 50;
        let previewText = message.replace(/\n/g, " ");
        if (previewText.length > maxLength) {
            return previewText.substring(0, maxLength - 3) + "...";
        }
        return previewText;
    }

    // implement attachMessageCopyEvent function
    attachMessageCopyEvent(messageCopy) {
        // 实例化clipboard.js
        var clipboard = new ClipboardJS(messageCopy, {
            text: function (trigger) {
                // 获取爷爷节点的data-message属性内容
                var message = trigger.parentNode.parentNode.getAttribute("data-message");
                //convert the html escape characters to normal characters
                const textElement = document.createElement("textarea");
                textElement.innerHTML = message;
                message = textElement.value;
                return message;
            }
        });

        const self = this;
        clipboard.on("success", function () {
            self.showToast("copied successful");
        });
        clipboard.on("error", function () {
            self.showToast("copied failed");
        });
    }

    deleteMessage(messageId) {
        // Get message input and check if it's empty or not
        const messageInput = document.querySelector("#message-input");
        const isMessageInputEmpty = messageInput.value.trim() === "";

        // If message input is not empty, ask for user confirmation before replacing the text
        if (!isMessageInputEmpty) {
            const confirmation = confirm("“The message input currently contains text. Do you want to replace the existing text with the deleted message?");
            if (!confirmation) {
                return;
            }
        }

        // Remove message from DOM and also from prompt array by message id
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        // Update input value to messageElement's data-message
        messageInput.value = messageElement.dataset.message;
        messageElement.remove();
        this.app.prompts.removePrompt(messageId);
        this.saveCurrentProfileMessages();

        this.updateSlider();
    }


    inactiveMessage(messageId) {
        const message = document.querySelector(`[data-message-id="${messageId}"]`);
        if (message) {
            message.classList.remove("active");
        }
    }

    // save the current message content to local storage by username and profile name
    saveCurrentProfileMessages() {
        const messages = document.querySelectorAll(".message");
        const savedMessages = getMessages(getCurrentUsername(), getCurrentProfile().name);
        const loadedMessages = [];

        messages.forEach(message => {
            if (message.dataset.sender === "user" || message.dataset.sender === "assistant") {
                if (message.dataset.messageId === "undefined") {
                    loadedMessages.push({ role: message.dataset.sender, content: message.dataset.message, messageId: this.generateId() });
                } else {
                    loadedMessages.push({ role: message.dataset.sender, content: message.dataset.message, messageId: message.dataset.messageId });
                }
            }
        });

        // Merge loaded messages with saved messages
        const updatedMessages = savedMessages.filter(savedMessage => {
            return !loadedMessages.find(loadedMessage => loadedMessage.messageId === savedMessage.messageId);
        }).concat(loadedMessages);

        saveMessages(getCurrentUsername(), getCurrentProfile().name, updatedMessages);
    }

    // Clear message input except the first message
    clearMessage() {
        // clear mssages in DOM except the first message
        messagesContainer.innerHTML = "";
        app.prompts.clearExceptFirst();
        this.addMessage(app.prompts[0].role, app.prompts[0].content, app.prompts[0].messageId);
        this.saveCurrentProfileMessages();
        messageInput.value = "";

    }


    // Send message on button click
    async sendMessage(message = "", isRetry = false) {
        let messageId = this.generateId();
        if (message === "/clear") {
            clearMessage();
            return;
        }
        // if message look like: /system: xxx, then send xxx as system message
        if (message.startsWith("/system")) {
            message = message.replace("/system", "");
            let messageId = this.generateId();
            this.addMessage("system", message, messageId);
            this.app.prompts.clearPrompts();
            this.app.prompts.addPrompt({ role: "system", content: message, messageId: messageId });
            return;
        }

        if (message.startsWith("/image")) {
            const imageCaption = message.replace("/image", "").trim();
            this.addMessage("user", imageCaption, messageId);
            this.saveCurrentProfileMessages();
            this.generateImage(imageCaption);
            return;
        }

        if (!isRetry) {
            this.addMessage("user", message, messageId);
        }
        this.app.prompts.addPrompt({ role: "user", content: message, messageId: messageId });
        this.saveCurrentProfileMessages();
        // join prompts except the messageId field to a string
        const promptText = this.app.prompts.getPromptText();
        console.log(promptText);

        const messageInput = document.querySelector("#message-input");
        messageInput.value = "";

        try {
            this.showToast("AI thinking...");
            console.log(this.app.model);
            const data = await getGpt(promptText, this.app.model);
            // console.log(data);
            // If no response, pop last prompt and send a message
            if (!data) {
                messageId = this.generateId();
                const content = "AI没有返回结果，请再说一下你的问题，或者换个问题问我吧。";
                this.addMessage("assistant", content, messageId, false);
                this.app.prompts.addPrompt({ role: "assistant", content: content, messageId: messageId });
            } else {
                messageId = this.generateId();
                this.addMessage("assistant", data.message, messageId);
                this.app.prompts.addPrompt({ role: "assistant", content: data.message, messageId: messageId });
                const max_tokens = 6000;
                const tokens = data.totalTokens;

                const tokensSpan = document.querySelector("#tokens");
                tokensSpan.textContent = `${tokens}t`;
                // If tokens are over 80% of max_tokens, remove the first round conversation
                if (tokens > max_tokens * 0.8) {
                    const removedPrompts = this.app.prompts.removeRange(1, 2);
                    removedPrompts.forEach((p) => {
                        this.inactiveMessage(p.messageId);
                    });
                    this.app.prompts.updateFirstPrompt({ role: "system", content: getCurrentProfile().prompt, messageId: this.generateId() });
                }
            }
            this.saveCurrentProfileMessages();
        } catch (error) {
            let messageId = this.generateId();
            this.addMessage("assistant", error.message, messageId);
        }
    }

    loadMoreMessages() {
        const messagesContainer = document.querySelector("#messages");

        const savedMessages = JSON.parse(localStorage.getItem(getCurrentUsername() + "_" + getCurrentProfile().name) || "[]");
        const currentMessagesCount = messagesContainer.children.length;
        const messageLimit = 10;
        const startingIndex = savedMessages.length - currentMessagesCount - messageLimit > 0 ? savedMessages.length - currentMessagesCount - messageLimit : 0;

        // Check if system prompt is already loaded
        const systemPromptLoaded = Array.from(messagesContainer.children).some(message => message.dataset.sender === "system");

        // Record the current scroll position
        const currentScrollPosition = messagesContainer.scrollHeight - messagesContainer.scrollTop;
        savedMessages.slice(startingIndex, savedMessages.length - currentMessagesCount).reverse().forEach((message, index) => {
            let isActive = false;
            this.addMessageToTop(message.role, message.content, message.messageId, isActive);
        });


        // Set the scroll position back to the original position after loading more messages
        messagesContainer.scrollTop = messagesContainer.scrollHeight - currentScrollPosition;
    }


    // render menu list from data
    // it only happens when user submit the username or the page is loaded
    renderMenuList(data) {
        const profiles = data.profiles;
        setCurrentUsername(data.username);
        const usernameLabel = document.querySelector("#username-label");
        usernameLabel.textContent = getCurrentUsername();
        const messagesContainer = document.querySelector("#messages");
        messagesContainer.innerHTML = "";
        // Get currentProfile from storage.js if available, otherwise set it to the first profile
        const savedCurrentProfile = getCurrentProfile();
        // get profile name from savedCurrentProfile then find the profile object from profiles array incase the profile object is changed
        // then set currentProfile to the profile object
        let currentProfileName = savedCurrentProfile ? savedCurrentProfile.name : profiles[0].name;
        let currentProfile = profiles.find(profile => profile.name === currentProfileName);
        // if currentProfile is not found, set it to the first profile, currentProfileName is also set to the first profile name
        if (!currentProfile) {
            currentProfile = profiles[0];
            currentProfileName = currentProfile.name;
        }

        setCurrentProfile(currentProfile);
        this.setupPracticeMode();

        let messageId = this.generateId();
        this.app.prompts.addPrompt({ role: "system", content: getCurrentProfile().prompt, messageId: messageId });
        this.addMessage("system", getCurrentProfile().prompt, messageId);
        // read saved messages from local storage for current profile and current username
        const savedMessages = getMessages(getCurrentUsername(), getCurrentProfile().name);
        const startingIndex = savedMessages.length > this.messageLimit ? savedMessages.length - this.messageLimit : 0;
        // add saved messages to the message list and load last 2 messages(max) to prompts
        savedMessages.slice(startingIndex).forEach((message, index, arr) => {
            let isActive = false;
            if (index >= arr.length - 2) {
                this.app.prompts.addPrompt(message);
                isActive = true;
            }
            this.addMessage(message.role, message.content, message.messageId, isActive);
        });


        //empty menu list
        const menuList = document.querySelector("#menu-list");
        menuList.innerHTML = "";
        const aiProfile = document.querySelector("#ai-profile");
        aiProfile.innerHTML = `<i class="${getCurrentProfile().icon}"></i> ${getCurrentProfile().displayName}`;
        //add menu items
        profiles.forEach(item => {
            let li = document.createElement("li");
            li.dataset.profile = item.name;
            // set current selected menu item to active
            if (item.name === currentProfileName) {
                li.classList.add("active");
            }
            let icon = document.createElement("i");
            icon.className = `${item.icon}`;
            let span = document.createElement("span");
            span.textContent = item.displayName;
            li.appendChild(icon);
            li.appendChild(span);
            menuList.appendChild(li);
            // Capture the 'this' of UIManager instance
            const self = this;
            //add click event listener
            li.addEventListener("click", function () {
                // set current selected menu item to active and also remove active class from other menu items
                const activeItem = document.querySelector("#menu-list li.active");
                if (activeItem) {
                    activeItem.classList.remove("active");
                }
                this.classList.add("active");
                // reset practice mode
                self.turnOffPracticeMode();
                // change currentProfile
                var profileName = this.getAttribute("data-profile");
                setCurrentProfile(profiles.find(function (p) { return p.name === profileName; }));
                // 如果当前 profile 的 tts 属性为 enabled，则显示 ttsContainer
                self.setupPracticeMode();
                // 设置 profile 图标和名称
                const aiProfile = document.querySelector("#ai-profile");
                aiProfile.innerHTML = `<i class="${getCurrentProfile().icon}"></i> ${getCurrentProfile().displayName}`;
                messagesContainer.innerHTML = "";
                // 清空 prompts 数组
                self.app.prompts.clear();

                let messageId = self.generateId();
                self.app.prompts.addPrompt({ role: "system", content: getCurrentProfile().prompt, messageId: messageId });
                self.addMessage("system", getCurrentProfile().prompt, messageId);
                // read saved messages from local storage for current profile and current username
                const savedMessages = getMessages(getCurrentUsername(), getCurrentProfile().name);

                const startingIndex = savedMessages.length > self.messageLimit ? savedMessages.length - self.messageLimit : 0;
                // add saved messages to the message list and load last 2 messages(max) to prompts
                savedMessages.slice(startingIndex).forEach((message, index, arr) => {
                    let isActive = false;
                    if (index >= arr.length - 2) {
                        self.app.prompts.addPrompt(message);
                        isActive = true;
                    }
                    self.addMessage(message.role, message.content, message.messageId, isActive);
                });
            });
        });


    }

    setupPracticeMode() {
        const ttsContainer = document.querySelector("#tts-container");
        if (getCurrentProfile() && getCurrentProfile().tts === "enabled") {
            // if ttsContainer is not display, then display it
            ttsContainer.style.display = "inline-block";
        } else {
            // if ttsContainer is display, then hide it
            ttsContainer.style.display = "none";
        }
    }




    toggleSpeakerIcon(speaker) {
        speaker.classList.toggle("fa-volume-off");
        speaker.classList.toggle("fa-volume-up");
    }

    async playAudio(speaker) {
        return new Promise((resolve, reject) => {
            this.app.audio.onerror = () => {
                this.toggleSpeakerIcon(speaker);
                this.app.currentPlayingSpeaker = null;
                console.error("Error playing audio.");
                reject(new Error("Error playing audio."));
            };
            this.app.audio.onended = () => {
                this.toggleSpeakerIcon(speaker);
                this.app.currentPlayingSpeaker = null;
                resolve();
            };
            this.app.audio.onabort = () => {
                console.error("Audio play aborted.");
                resolve();
            };
            this.app.audio.play();
        });
    }

    // play the message with tts
    async playMessage(speaker) {
        // if the speaker is playing, stop it and return
        if (speaker.classList.contains("fa-volume-up")) {
            //if the audio is playing, stop it
            this.app.audio.pause();
            this.toggleSpeakerIcon(speaker);
            this.app.currentPlayingSpeaker = null;
            return;
        }
        // If there is a speaker currently playing, stop it and reset its icon
        if (this.app.currentPlayingSpeaker && this.app.currentPlayingSpeaker !== speaker) {
            this.app.audio.pause();
            this.toggleSpeakerIcon(this.app.currentPlayingSpeaker); // Reset the icon of the previous speaker
        }

        // Update the currentPlayingSpeaker variable
        this.app.setCurrentPlayingSpeaker(speaker);

        //get message from parent element dataset message attribute
        const message = speaker.parentElement.parentElement.dataset.message;

        try {
            this.toggleSpeakerIcon(speaker);
            const blob = await getTts(message);
            console.log("ready to play...");
            this.app.audio.src = URL.createObjectURL(blob);
            await this.playAudio(speaker);
        } catch (error) {
            this.toggleSpeakerIcon(speaker);
            console.error(error);
        }
    }
}

export default UIManager;

