const axios = require('axios');
const logger = require('./logger');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent';

// Rate limiting for Gemini API
const rateLimiter = {
    requests: [],
    maxRequests: 60, // requests per minute
    windowMs: 60 * 1000, // 1 minute
    
    canMakeRequest() {
        const now = Date.now();
        // Remove requests older than the window
        this.requests = this.requests.filter(time => now - time < this.windowMs);
        
        if (this.requests.length >= this.maxRequests) {
            return false;
        }
        
        this.requests.push(now);
        return true;
    },
    
    getRetryDelay() {
        const now = Date.now();
        const oldestRequest = this.requests[0];
        return oldestRequest ? (this.windowMs - (now - oldestRequest)) : 0;
    }
};

// Generate project suggestions using Gemini API
const generateProjectSuggestions = async (projectDetails) => {
    try {
        // Check rate limiting
        if (!rateLimiter.canMakeRequest()) {
            const retryDelay = rateLimiter.getRetryDelay();
            throw new Error(`Rate limit exceeded. Please try again in ${Math.ceil(retryDelay / 1000)} seconds.`);
        }

        const prompt = `You are an expert technology consultant for InoxDev, a company specializing in Full Stack Development, DevSecOps Solutions, Cloud Services & Migration, Cybersecurity Audits, SaaS Product Development, UI/UX Design, Blockchain Development & Web3 Consulting, and AI/ML Consulting and Development.

A potential client has provided the following project details:
\`\`\`
${projectDetails}
\`\`\`

Please provide the following in markdown format:
1. **Project Summary:** A concise summary of the client's project.
2. **Recommended InoxDev Services:** List 2-3 services from our offerings that are most relevant to this project, explaining why.
3. **Key Considerations:** Suggest 2-3 important technical or strategic considerations the client should keep in mind for this project.
4. **Next Steps:** Suggest 1-2 immediate next steps for the client.

Keep the response professional, concise, and encouraging. Focus on practical advice that demonstrates InoxDev's expertise.`;

        const payload = {
            contents: [{
                role: "user",
                parts: [{ text: prompt }]
            }]
        };

        let response;
        let retryCount = 0;
        const maxRetries = 3;
        const baseDelay = 1000; // 1 second

        while (retryCount < maxRetries) {
            try {
                response = await axios.post(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, payload, {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000 // 30 seconds timeout
                });

                if (response.status === 200) {
                    break; // Success, exit retry loop
                }
            } catch (error) {
                if (error.response?.status === 429) {
                    // Rate limit exceeded, implement exponential backoff
                    retryCount++;
                    const delay = baseDelay * Math.pow(2, retryCount - 1);
                    logger.warn(`Gemini API rate limit exceeded. Retrying in ${delay / 1000} seconds...`);
                    
                    if (retryCount < maxRetries) {
                        await new Promise(resolve => setTimeout(resolve, delay));
                        continue;
                    }
                }
                throw error;
            }
        }

        if (!response || response.status !== 200) {
            throw new Error('Failed to get a successful response from Gemini API after retries');
        }

        const result = response.data;

        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            
            const suggestions = result.candidates[0].content.parts[0].text;
            
            logger.info('Successfully generated project suggestions via Gemini API');
            return suggestions;
        } else {
            logger.error('Unexpected Gemini API response structure:', JSON.stringify(result, null, 2));
            throw new Error('Invalid response structure from Gemini API');
        }

    } catch (error) {
        logger.error('Gemini API error:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
        });

        if (error.response?.status === 429) {
            throw new Error('Service temporarily unavailable due to high demand. Please try again in a few minutes.');
        }

        if (error.response?.status === 403) {
            throw new Error('API access denied. Please check API key configuration.');
        }

        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            throw new Error('Request timeout. Please try again.');
        }

        throw new Error('Failed to generate project suggestions. Please try again later.');
    }
};

// Generate content for blog posts or marketing materials
const generateContent = async (contentType, topic, additionalContext = '') => {
    try {
        if (!rateLimiter.canMakeRequest()) {
            const retryDelay = rateLimiter.getRetryDelay();
            throw new Error(`Rate limit exceeded. Please try again in ${Math.ceil(retryDelay / 1000)} seconds.`);
        }

        let prompt;
        
        switch (contentType) {
            case 'blog-post':
                prompt = `Write a comprehensive blog post about "${topic}" for InoxDev's technical blog. The post should be informative, engaging, and demonstrate our expertise in modern web development and DevSecOps. Include practical examples and best practices. ${additionalContext}`;
                break;
            
            case 'service-description':
                prompt = `Write a detailed service description for "${topic}" that InoxDev offers. Focus on benefits, technical approach, and value proposition for startups and growing businesses. ${additionalContext}`;
                break;
            
            case 'case-study':
                prompt = `Create a case study outline for a project involving "${topic}". Include challenge, solution, implementation, and results sections. Make it relevant to InoxDev's service offerings. ${additionalContext}`;
                break;
            
            default:
                throw new Error('Invalid content type');
        }

        const payload = {
            contents: [{
                role: "user",
                parts: [{ text: prompt }]
            }]
        };

        const response = await axios.post(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, payload, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        if (response.status === 200 && response.data.candidates && response.data.candidates.length > 0) {
            const content = response.data.candidates[0].content.parts[0].text;
            logger.info(`Successfully generated ${contentType} content for topic: ${topic}`);
            return content;
        }

        throw new Error('Invalid response from Gemini API');

    } catch (error) {
        logger.error('Content generation error:', error.message);
        throw error;
    }
};

// Analyze project requirements and suggest technology stack
const analyzeTechStack = async (requirements) => {
    try {
        if (!rateLimiter.canMakeRequest()) {
            const retryDelay = rateLimiter.getRetryDelay();
            throw new Error(`Rate limit exceeded. Please try again in ${Math.ceil(retryDelay / 1000)} seconds.`);
        }

        const prompt = `As a senior technical architect at InoxDev, analyze the following project requirements and recommend an optimal technology stack:

Requirements:
${requirements}

Please provide:
1. **Frontend Technologies:** Recommend the best frontend framework/library and supporting tools
2. **Backend Technologies:** Suggest backend technologies, databases, and APIs
3. **DevOps & Infrastructure:** Recommend deployment, monitoring, and scaling solutions
4. **Security Considerations:** Key security measures and tools
5. **Estimated Timeline:** High-level project phases and timeline
6. **Budget Considerations:** Cost factors and optimization strategies

Format your response in clear markdown with practical justifications for each recommendation.`;

        const payload = {
            contents: [{
                role: "user",
                parts: [{ text: prompt }]
            }]
        };

        const response = await axios.post(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, payload, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        if (response.status === 200 && response.data.candidates && response.data.candidates.length > 0) {
            const analysis = response.data.candidates[0].content.parts[0].text;
            logger.info('Successfully generated tech stack analysis');
            return analysis;
        }

        throw new Error('Invalid response from Gemini API');

    } catch (error) {
        logger.error('Tech stack analysis error:', error.message);
        throw error;
    }
};

// Generate SEO-optimized meta descriptions
const generateSEOContent = async (pageTitle, pageContent) => {
    try {
        if (!rateLimiter.canMakeRequest()) {
            const retryDelay = rateLimiter.getRetryDelay();
            throw new Error(`Rate limit exceeded. Please try again in ${Math.ceil(retryDelay / 1000)} seconds.`);
        }

        const prompt = `Generate SEO-optimized content for a webpage about "${pageTitle}" for InoxDev's website.

Page Content Summary:
${pageContent}

Please provide:
1. **Meta Title:** (50-60 characters, include "InoxDev")
2. **Meta Description:** (150-160 characters, compelling and informative)
3. **Keywords:** (10-15 relevant keywords)
4. **H1 Tag:** (Optimized main heading)
5. **Schema Markup Suggestions:** (Relevant schema.org types)

Focus on InoxDev's core services: DevSecOps, Full Stack Development, Cloud Services, Cybersecurity, and emerging technologies.`;

        const payload = {
            contents: [{
                role: "user",
                parts: [{ text: prompt }]
            }]
        };

        const response = await axios.post(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, payload, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        if (response.status === 200 && response.data.candidates && response.data.candidates.length > 0) {
            const seoContent = response.data.candidates[0].content.parts[0].text;
            logger.info(`Successfully generated SEO content for: ${pageTitle}`);
            return seoContent;
        }

        throw new Error('Invalid response from Gemini API');

    } catch (error) {
        logger.error('SEO content generation error:', error.message);
        throw error;
    }
};

module.exports = {
    generateProjectSuggestions,
    generateContent,
    analyzeTechStack,
    generateSEOContent
};