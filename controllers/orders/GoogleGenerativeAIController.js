const { GoogleGenerativeAI } = require("@google/generative-ai");

class GoogleGenerativeAIController {
  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  bufferToGenerativePart(buffer, mimeType) {
    return {
      inlineData: {
        data: buffer.toString("base64"),
        mimeType
      }
    };
  }

  isContentSafe(content) {
    const unsafeKeywords = ["inappropriate", "violent", "sensitive"];
    return !unsafeKeywords.some(keyword => content.includes(keyword));
  }

  async processImageBuffer(buffer, mimeType) {
    const maxRetries = 3;
    let attempt = 0;
    const prompt = "What is the amount in the image remove the rupee symbol and commas if any in amount, UPI transactionid(which is 12 digit numeric only) or UTR (which is 12 digit numeric only) or UPI Ref No (which is 12 digit numeric only) and What is the date and time in this image. Response in json with following key , amount, id, date, time) if 'UTR' exist replace the value of 'id' with 'UTR' value";
    const imagePart = this.bufferToGenerativePart(buffer, mimeType);

    while (attempt < maxRetries) {
      try {
        const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent([prompt, imagePart]);

        console.log("===========gemini AI=============");
        console.log(result);
        console.log('==============');
        const response = await result.response;

        if (response.safetyInfo && response.safetyInfo.blocked) {
          throw new Error("Response blocked due to safety concerns");
        }

        const text = await response.text();

        if (!this.isContentSafe(text)) {
          throw new Error("Generated content deemed unsafe by custom filter");
        }

        return { status: true, text };
      } catch (error) {
        
        attempt++;
        console.error(`Attempt ${attempt} failed:`, error);

        if (attempt >= maxRetries) {
          console.error("Max retries reached. Skipping this file.");
          return { status: false, error: error.message };
        }

        console.log(`Retrying (${attempt}/${maxRetries})...`);
      }
    }
  }
}

module.exports = GoogleGenerativeAIController;