/**
 * netlify/functions/api.js — Netlify Serverless Function Handler for Express API
 */

require('dotenv').config();
const serverless = require('serverless-http');
const app = require('../../app');

module.exports.handler = serverless(app);
