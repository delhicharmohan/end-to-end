
const amountRegex = /\bRs\.?\s?([\d,]+\.?\d*)|\bINR\s([\d,]+\.?\d*)/g;
const utrRegex = /\b([45]\d{11})\b|\b([45]\d{8})\b|\bUPI\ ref\ num\ (\d{9})\b/g;

class MessageFormat {



     extractFirstAmount(text) {
        const matches = text.match(amountRegex);
        if (matches && matches.length > 0) {
            const firstMatch = matches[0].replace(/Rs\.?|INR|\s|,/g, '');
            return parseFloat(firstMatch);
        }
        return null;
      }
      
      // Function to extract the UTR number
       extractUTR(text) {
        const matches = text.match(utrRegex);
        return matches ? matches[0].replace(/\D/g, '') : null;
      }
}

module.exports = MessageFormat;