const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

class AIService {
  async parseDocument(filePath, documentType) {
    try {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(filePath));
      formData.append('documentType', documentType);

      const response = await axios.post(`${AI_SERVICE_URL}/api/parse`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
      });

      return response.data;
    } catch (error) {
      console.error('AI Service Error (Parse Document):', error.message);
      throw new Error(error.response?.data?.message || 'Failed to parse document with AI service');
    }
  }

  async checkCompliance(parsedData, rules) {
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/api/compliance-check`, {
        parsedData,
        rules,
      });

      return response.data;
    } catch (error) {
      console.error('AI Service Error (Check Compliance):', error.message);
      throw new Error(error.response?.data?.message || 'Failed to check compliance with AI service');
    }
  }
}

module.exports = new AIService();
