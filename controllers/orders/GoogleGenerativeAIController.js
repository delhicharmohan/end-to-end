const { GoogleGenerativeAI } = require("@google/generative-ai");

class GoogleGenerativeAIController {
  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    // Preferred model from env, else use a robust fallback list compatible with v1beta
    this.preferredModel = process.env.GOOGLE_GENAI_MODEL;
    this.modelCandidates = [
      // Latest recommended names first
      "gemini-1.5-flash-latest",
      "gemini-1.5-pro-latest",
      // Older/alternate names that support image input in v1beta
      "gemini-pro-vision",
      "gemini-1.0-pro-vision",
      // Specific version in case -latest aliases are unavailable
      "gemini-1.5-flash-001"
    ];
    if (this.preferredModel) {
      // Put preferred model at the front if provided
      this.modelCandidates = [this.preferredModel, ...this.modelCandidates.filter(m => m !== this.preferredModel)];
    }
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
    // Try each candidate model, and within each, allow a couple of retries for transient errors
    for (const modelName of this.modelCandidates) {
      attempt = 0;
      while (attempt < maxRetries) {
        try {
          const model = this.genAI.getGenerativeModel({ model: modelName });
          // Some SDK versions accept [prompt, imagePart]; keep it for compatibility
          const result = await model.generateContent([prompt, imagePart]);

          console.log("===========gemini AI=============");
          console.log({ model: modelName, raw: !!result });
          console.log('==============');
          const response = await result.response;

          if (response && response.safetyInfo && response.safetyInfo.blocked) {
            throw new Error("Response blocked due to safety concerns");
          }

          const text = await response.text();

          if (!this.isContentSafe(text)) {
            throw new Error("Generated content deemed unsafe by custom filter");
          }

          return { status: true, text, model: modelName };
        } catch (error) {
          attempt++;
          // Log concise error with model name to help debugging in production
          console.error(`Attempt ${attempt} failed for model '${modelName}':`, error?.message || error);

          // If 404 model-not-found or method unsupported, break to next model immediately
          const msg = (error?.message || "").toLowerCase();
          if (msg.includes("not found") || msg.includes("unsupported") || msg.includes("404")) {
            console.warn(`Model '${modelName}' appears unavailable on this API version. Trying next model...`);
            break;
          }

          if (attempt >= maxRetries) {
            console.warn(`Max retries reached for model '${modelName}'. Trying next model...`);
            break;
          }

          console.log(`Retrying (${attempt}/${maxRetries}) for model '${modelName}'...`);
        }
      }
    }

    return { status: false, error: "All Gemini model candidates failed on this environment" };
  }
}

module.exports = GoogleGenerativeAIController;