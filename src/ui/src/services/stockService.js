import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const stockService = {
  async getStockData(symbol) {
    try {
      const response = await axios.get(`${API_BASE_URL}/stock/${symbol}?t=${Date.now()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching stock data:', error);
      throw error;
    }
  },

  async getStockAnalysis(symbol) {
    try {
      const response = await axios.get(`${API_BASE_URL}/analysis/${symbol}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching stock analysis:', error);
      throw error;
    }
  },

  async getLlmAnalysis(symbol) {
    try {
      const response = await axios.get(`${API_BASE_URL}/llm-analysis/${symbol}`);
      return response.data;
    } catch (error) {
      // A 404 is expected if no analysis exists, so don't throw for it
      if (error.response && error.response.status === 404) {
        return null;
      }
      console.error('Error fetching LLM analysis:', error);
      throw error;
    }
  },

  async getLlmPrompt(symbol) {
    try {
      const response = await axios.get(`${API_BASE_URL}/llm-analysis/${symbol}/prompt`);
      return response.data;
    } catch (error) {
      // A 404 is expected if no analysis exists, so don't throw for it
      if (error.response && error.response.status === 404) {
        return null;
      }
      console.error('Error fetching LLM prompt:', error);
      throw error;
    }
  },

  async refreshLlmAnalysis(symbol) {
    try {
      const response = await axios.post(`${API_BASE_URL}/llm-analysis/${symbol}/refresh`);
      return response.data;
    } catch (error) {
      console.error('Error refreshing LLM analysis:', error);
      throw error;
    }
  },

  async refreshStockData(symbol) {
    try {
      const response = await axios.post(`${API_BASE_URL}/stock/${symbol}/refresh`);
      return response.data;
    } catch (error) {
      console.error('Error refreshing stock data:', error);
      throw error;
    }
  },

  async getHealthCheck() {
    try {
      const response = await axios.get(`${API_BASE_URL}/health`);
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }
};

export default stockService;