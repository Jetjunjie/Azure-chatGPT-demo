# chatGPTdemo for Azure OpenAI gpt-35-turbo (version 0301)/gpt4 model 🤖

Welcome to chatGPTdemo, a fascinating demo website built with Node.js and Azure OpenAI gpt-35-turbo (version 0301)/gpt4 model. This project serves as a great starting point for developers who are interested in developing chatbot applications using JavaScript and Azure OpenAI API.

## 🌟 Features

![chatGPTdemo](./demo.png)

- Easy-to-use chat interface
- Customizable AI character role
- Mobile and tablet compatibility
- Support for Azure Text-to-Speech engine
- Auto-play bot message audio option
- User profile switch feature
- Display actor avatar and name in header when selected
- Support for loading system prompt from remote URL
- System message customization using /system xxx command
- Message formatting preservation
- Token counter
- **Support for adding and removing messages in current round conversation 💬**

## 🚀 Getting Started

### Prerequisites

- Node.js installed on your local machine
- An API key and endpoint from Azure OpenAI portal

### Installation

1. Clone the project to your local machine
2. Create a `.env` file in the root folder of the project
3. Add your API key and endpoint to the `.env` file using the following format:

   ```
   API_KEY=yourgpt35apikey
   API_URL=https://$yourendpoint/openai/deployments/$gptmodelname$/chat/completions?api-version=2023-03-15-preview
   GPT4_API_KEY=yourgpt4apikey
   GPT4_API_URL=https://$yourendpoint/openai/deployments/$gpt4modelname$/chat/completions?api-version=2023-03-15-preview
   ```

4. (Optional) Add extra features with `PROMPT_REPO_URLS` and `AZURE_TTS`:

   - `PROMPT_REPO_URLS` is a JSON object containing the user name and the URL of the prompt file:
     ```
     PROMPT_REPO_URLS={"user1":"user1prompts.json", "user2":"user2prompts.json","user3":"user3prompts.json"}
     ```
     For the `user1prompts.json` content format, check the example file at `./public/prompts.json`.

   - `AZURE_TTS` is a JSON object containing the subscription key and the endpoint of the Azure Text-to-Speech service:

     ```
     AZURE_TTS={"subscriptionKey":"your subscription key","endpoint":"your endpoint"}
     ```

5. Install the necessary packages:

   ```
   npm install
   ```

6. Start the server:

   ```
   node server.js
   ```

7. Open your browser and visit [http://localhost:3000](http://localhost:3000) to enjoy the chatGPTdemo website!

![chatGPTdemo](./demo.png)

Now you're all set to explore and develop your chatbot application using JavaScript and Azure OpenAI API. Happy coding! 🎉