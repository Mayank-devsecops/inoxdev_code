// Global variables
let currentTestimonial = 0;
const testimonials = document.querySelectorAll('.testimonial');
let isScrolling = false;

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeParticles();
    initializeNavigation();
    initializeScrollAnimations();
    initializeCounters();
    initializeTestimonialSlider();
    initializeFormValidation();
    // Initialize theme based on saved preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        document.querySelector('.theme-toggle').textContent = '☀️';
    }
});

// Particle system
function initializeParticles() {
    const particlesContainer = document.getElementById('particles');
    const particleCount = 50;

    for (let i = 0; i < particleCount; i++) {
        createParticle(particlesContainer);
    }

    // Create new particles periodically
    setInterval(() => {
        if (particlesContainer.children.length < particleCount) {
            createParticle(particlesContainer);
        }
    }, 3000);
}

function createParticle(container) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    
    // Random size and position
    const size = Math.random() * 3 + 1;
    const startX = Math.random() * window.innerWidth;
    const duration = Math.random() * 10 + 15;
    
    particle.style.width = size + 'px';
    particle.style.height = size + 'px';
    particle.style.left = startX + 'px';
    particle.style.animationDuration = duration + 's';
    particle.style.animationDelay = Math.random() * 5 + 's';
    
    container.appendChild(particle);

    // Remove particle after animation
    setTimeout(() => {
        if (particle.parentNode) {
            particle.parentNode.removeChild(particle);
        }
    }, (duration + 5) * 1000);
}

// Navigation functionality
function initializeNavigation() {
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('nav-menu');
    const navbar = document.getElementById('navbar');

    // Hamburger menu toggle
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });

    // Close menu when clicking nav links
    document.querySelectorAll('.nav-menu a').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });

    // Navbar scroll effect
    window.addEventListener('scroll', () => {
        if (window.scrollY > 100) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
        
        updateActiveNavLink();
    });
}

// Active navigation link management
function updateActiveNavLink() {
    if (isScrolling) return;

    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-menu a');
    
    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (window.scrollY >= (sectionTop - 200)) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        // Only check for links that actually exist in the navbar
        if (link.getAttribute('href') && link.getAttribute('href').substring(1) === current) {
            link.classList.add('active');
        }
    });
}

// Scroll animations
function initializeScrollAnimations() {
    const sections = document.querySelectorAll('.section');
    
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate');
            }
        });
    }, observerOptions);

    sections.forEach(section => {
        observer.observe(section);
    });
}

// Counter animations
function initializeCounters() {
    const counters = document.querySelectorAll('.stat-number');
    
    const observerOptions = {
        threshold: 0.5
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const counter = entry.target;
                // ParseInt will handle "45+" as 45
                const target = parseInt(counter.getAttribute('data-target'));
                animateCounter(counter, target);
                observer.unobserve(counter);
            }
        });
    }, observerOptions);

    counters.forEach(counter => {
        observer.observe(counter);
    });
}

function animateCounter(element, target) {
    let current = 0;
    const increment = target / 50;
    const duration = 2000;
    const stepTime = duration / 50;

    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target + (element.getAttribute('data-target').includes('+') ? '+' : ''); // Re-add '+' if present
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current);
        }
    }, stepTime);
}

// Testimonial slider
function initializeTestimonialSlider() {
    if (testimonials.length === 0) return;
    
    testimonials[currentTestimonial].classList.add('active');
    
    setInterval(() => {
        testimonials[currentTestimonial].classList.remove('active');
        currentTestimonial = (currentTestimonial + 1) % testimonials.length;
        testimonials[currentTestimonial].classList.add('active');
    }, 5000);
}

// Form validation
function initializeFormValidation() {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        const inputs = form.querySelectorAll('.form-input');
        inputs.forEach(input => {
            input.addEventListener('blur', () => validateField(input));
            input.addEventListener('input', () => clearFieldError(input));
        });
    });
}

function validateField(field) {
    const value = field.value.trim();
    const fieldName = field.name;
    const errorElement = document.getElementById(`${field.id}-error`);
    
    let isValid = true;
    let errorMessage = '';

    if (field.hasAttribute('required') && !value) {
        isValid = false;
        errorMessage = `Please enter your ${fieldName.replace('-', ' ')}`;
    } else if (field.type === 'email' && value && !isValidEmail(value)) {
        isValid = false;
        errorMessage = 'Please enter a valid email address';
    }

    if (errorElement) {
        if (isValid) {
            errorElement.style.display = 'none';
            field.style.borderColor = 'var(--primary-blue)';
        } else {
            errorElement.textContent = errorMessage;
            errorElement.style.display = 'block';
            field.style.borderColor = '#ff6b6b';
        }
    }

    return isValid;
}

function clearFieldError(field) {
    const errorElement = document.getElementById(`${field.id}-error`);
    if (errorElement) {
        errorElement.style.display = 'none';
        field.style.borderColor = 'rgba(138, 43, 226, 0.3)';
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Custom Message Box Functions (replacing alert)
function showMessageBox(title, message) {
    const msgBox = document.getElementById('custom-message-box');
    document.getElementById('message-box-title').textContent = title;
    document.getElementById('message-box-text').textContent = message;
    msgBox.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Prevent scrolling behind modal
}

function closeMessageBox() {
    const msgBox = document.getElementById('custom-message-box');
    msgBox.style.display = 'none';
    document.body.style.overflow = 'auto'; // Restore scrolling
}

// Contact form submission
async function handleContactSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitButton = document.getElementById('contact-submit');
    const spinner = document.getElementById('contact-spinner');
    const successMessage = document.getElementById('contact-success');
    const projectSuggestionsOutput = document.getElementById('project-suggestions-output'); // Get the suggestions div
    
    // Validate all fields
    const inputs = form.querySelectorAll('.form-input[required]');
    let isFormValid = true;
    
    inputs.forEach(input => {
        if (!validateField(input)) {
            isFormValid = false;
        }
    });
    
    if (!isFormValid) {
        showMessageBox('Validation Error', 'Please fill in all required fields correctly.');
        return;
    }
    
    // Show loading state
    submitButton.classList.add('loading');
    spinner.style.display = 'inline-block';
    submitButton.disabled = true;
    
    try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Show success message
        successMessage.style.display = 'block';
        form.reset();
        
        // Clear the project suggestions after successful submission
        projectSuggestionsOutput.innerHTML = ''; 
        
        // Show success state on button
        submitButton.classList.add('success');
        submitButton.innerHTML = '<span>✓ Message Sent!</span>';
        
        // Reset button after 3 seconds
        setTimeout(() => {
            submitButton.classList.remove('loading', 'success');
            submitButton.innerHTML = 'Send Message';
            submitButton.disabled = false;
            spinner.style.display = 'none';
        }, 3000);
        
    } catch (error) {
        console.error('Form submission error:', error);
        showMessageBox('Submission Error', 'Sorry, there was an error sending your message. Please try again.');
        
        // Reset loading state
        submitButton.classList.remove('loading');
        spinner.style.display = 'none';
        submitButton.disabled = false;
    }
}

// Removed Login form submission (handleLoginSubmit) as per request

// FAQ functionality
function toggleFaq(element) {
    const faqItem = element.parentElement;
    const answer = faqItem.querySelector('.faq-answer');
    const toggle = element.querySelector('.faq-toggle');
    
    // Close other FAQ items
    document.querySelectorAll('.faq-item').forEach(item => {
        if (item !== faqItem) {
            item.classList.remove('active');
            item.querySelector('.faq-answer').classList.remove('active');
        }
    });
    
    // Toggle current item
    faqItem.classList.toggle('active');
    answer.classList.toggle('active');
    
    // Update toggle icon
    toggle.textContent = faqItem.classList.contains('active') ? '×' : '+';
}

function handleFaqKeypress(event, element) {
    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleFaq(element);
    }
}

// Utility functions
function scrollToSection(sectionId) {
    isScrolling = true;
    const element = document.getElementById(sectionId);
    const offsetTop = element.offsetTop - 100;
    
    window.scrollTo({
        top: offsetTop,
        behavior: 'smooth'
    });
    
    setTimeout(() => {
        isScrolling = false;
    }, 1000);
}

function showForgotPassword() {
    showMessageBox('Password Reset', 'In a real application, this would open a password reset form or redirect to a password reset page.');
}

function toggleTheme() {
    const body = document.body;
    const themeButton = document.querySelector('.theme-toggle');
    
    body.classList.toggle('light-theme');
    
    if (body.classList.contains('light-theme')) {
        themeButton.textContent = '☀️';
        // In a real application, you would save this preference
        localStorage.setItem('theme', 'light');
    } else {
        themeButton.textContent = '🌙';
        localStorage.setItem('theme', 'dark');
    }
}

// Modal functions for services and projects
function openServiceModal(serviceType) {
    const serviceDetails = {
        fullstack: {
            title: 'Full Stack Development',
            description: 'Complete end-to-end web application development using cutting-edge technologies and best practices.',
            features: ['Modern React/Vue.js frontends', 'Scalable Node.js/Python backends', 'Database design and optimization', 'API development and integration', 'Performance optimization', 'Security implementation'],
            technologies: ['React', 'Vue.js', 'Node.js', 'Python', 'MongoDB', 'PostgreSQL', 'Redis', 'GraphQL']
        },
        devsecops: {
            title: 'DevSecOps Solutions',
            description: 'Integrate security into every stage of your development lifecycle with automated CI/CD pipelines.',
            features: ['Automated CI/CD pipelines', 'Infrastructure as Code', 'Security scanning and monitoring', 'Container orchestration', 'Cloud infrastructure management', '24/7 monitoring and alerting'],
            technologies: ['Docker', 'Kubernetes', 'Jenkins', 'GitLab CI', 'Terraform', 'Ansible', 'Prometheus', 'Grafana']
        },
        cloud: {
            title: 'Cloud Services & Migration',
            description: 'Expert cloud architecture design and migration services for optimal performance and cost efficiency.',
            features: ['Cloud architecture design', 'Migration planning and execution', 'Cost optimization strategies', 'Auto-scaling implementation', 'Disaster recovery setup', 'Multi-cloud strategies'],
            technologies: ['AWS', 'Azure', 'Google Cloud', 'Serverless', 'Lambda', 'CloudFormation', 'CDN', 'Load Balancers']
        },
        security: {
            title: 'Cybersecurity Audits',
            description: 'Comprehensive security assessments to identify vulnerabilities and ensure compliance.',
            features: ['Penetration testing', 'Vulnerability assessments', 'Compliance audits', 'Security policy development', 'Incident response planning', 'Security training'],
            technologies: ['OWASP', 'Nessus', 'Burp Suite', 'Metasploit', 'ISO 27001', 'SOC 2', 'GDPR', 'PCI DSS']
        },
        saas: {
            title: 'SaaS Product Development',
            description: 'From MVP to scale - complete SaaS product development with enterprise-grade features.',
            features: ['Multi-tenant architecture', 'Subscription management', 'User authentication and authorization', 'Analytics and reporting', 'API development', 'Third-party integrations'],
            technologies: ['Multi-tenancy', 'Stripe', 'Auth0', 'Analytics', 'Webhooks', 'Rate Limiting', 'Caching', 'Queue Systems']
        },
        design: {
            title: 'UI/UX Design',
            description: 'User-centered design approach creating intuitive interfaces that drive engagement.',
            features: ['User research and personas', 'Wireframing and prototyping', 'Visual design systems', 'Usability testing', 'Responsive design', 'Accessibility optimization'],
            technologies: ['Figma', 'Adobe XD', 'Sketch', 'InVision', 'Principle', 'Zeplin', 'Marvel', 'Framer']
        },
        // New Service: Blockchain Development & Web3 Consulting
        blockchain: {
            title: 'Blockchain Development & Web3 Consulting',
            description: 'Building decentralized applications (dApps), smart contracts, and providing expert guidance on Web3 strategies and blockchain integration.',
            features: ['Smart contract development (Solidity)', 'Decentralized application (dApp) creation', 'NFT marketplaces and solutions', 'DeFi protocol integration', 'Blockchain architecture design', 'Tokenomics and whitepaper consulting'],
            technologies: ['Solidity', 'Ethereum', 'Binance Smart Chain', 'Polygon', 'Web3.js', 'Ethers.js', 'Hardhat', 'Truffle', 'IPFS']
        },
        // New Service: AI/ML Consulting and Development
        'ai-ml': {
            title: 'AI/ML Consulting and Development',
            description: 'Leveraging Artificial Intelligence and Machine Learning to build intelligent solutions, automate processes, and derive insights from data.',
            features: ['Custom AI/ML model development', 'Data analysis and predictive modeling', 'Natural Language Processing (NLP)', 'Computer Vision solutions', 'Intelligent automation', 'MLOps and deployment strategies'],
            technologies: ['Python', 'TensorFlow', 'PyTorch', 'Scikit-learn', 'Keras', 'Jupyter', 'OpenCV', 'NLTK', 'SpaCy', 'AWS SageMaker', 'Google AI Platform']
        }
    };
    
    const service = serviceDetails[serviceType];
    if (!service) return;
    
    let featuresHTML = service.features.map(feature => `<li>✓ ${feature}</li>`).join('');
    let techHTML = service.technologies.map(tech => `<span class="tech-tag">${tech}</span>`).join('');
    
    const modalHTML = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2>${service.title}</h2>
                    <button class="modal-close" onclick="closeModal()">×</button>
                </div>
                <div class="modal-body">
                    <p class="modal-description">${service.description}</p>
                    <h3>Key Features:</h3>
                    <ul class="modal-features">${featuresHTML}</ul>
                    <h3>Technologies We Use:</h3>
                    <div class="modal-tech-stack">${techHTML}</div>
                    <div class="modal-actions">
                        <button class="glow-button" onclick="scrollToSection('contact'); closeModal();">Get Started</button>
                        <button class="glow-button button-small" onclick="closeModal()">Close</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.body.style.overflow = 'hidden';
}

function openProjectModal(projectType) {
    const projectDetails = {
        edutech: {
            title: 'EduTech SaaS Platform',
            description: 'A comprehensive school management system that revolutionized how educational institutions manage their operations.',
            challenge: 'The client needed to digitize their paper-based processes and provide real-time communication between teachers, students, and parents.',
            solution: 'We built a multi-tenant SaaS platform with role-based access, automated report generation, and real-time notifications.',
            results: ['50+ schools onboarded', '10,000+ active students', '40% reduction in administrative time', '95% parent satisfaction rate'],
            technologies: ['React', 'Node.js', 'MongoDB', 'AWS', 'Socket.io', 'Redis']
        },
        dashboard: {
            title: 'DevSecOps Monitoring Dashboard',
            description: 'Real-time security and deployment monitoring dashboard for a fast-growing fintech startup.',
            challenge: 'The startup needed unified visibility across 15+ security tools and compliance requirements.',
            solution: 'We created a centralized dashboard with custom integrations, automated compliance reporting, and intelligent alerting.',
            results: ['80% faster deployment cycles', 'Zero security incidents in 18 months', '90% reduction in manual compliance work', 'SOC 2 Type II certification achieved'],
            technologies: ['React', 'Python', 'Kubernetes', 'Grafana', 'Prometheus', 'Elasticsearch']
        },
        crm: {
            title: 'InoxCRM - Custom CRM Solution',
            description: 'Our proprietary CRM system designed specifically for technology service companies.',
            challenge: 'Existing CRM solutions didn\'t fit the unique needs of tech service businesses with complex project workflows.',
            solution: 'We built a custom CRM with project management integration, automated client communication, and advanced analytics.',
            results: ['60% improvement in sales efficiency', '300% increase in lead conversion', '50% reduction in client churn', '24/7 automated client updates'],
            technologies: ['Vue.js', 'Django', 'PostgreSQL', 'Redis', 'Celery', 'Chart.js']
        }
    };
    
    const project = projectDetails[projectType];
    if (!project) return;
    
    let resultsHTML = project.results.map(result => `<li>🎯 ${result}</li>`).join('');
    let techHTML = project.technologies.map(tech => `<span class="tech-tag">${tech}</span>`).join('');
    
    const modalHTML = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-content project-modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2>${project.title}</h2>
                    <button class="modal-close" onclick="closeModal()">×</button>
                </div>
                <div class="modal-body">
                    <p class="modal-description">${project.description}</p>
                    
                    <div class="project-section">
                        <h3>The Challenge</h3>
                        <p>${project.challenge}</p>
                    </div>
                    
                    <div class="project-section">
                        <h3>Our Solution</h3>
                        <p>${project.solution}</p>
                    </div>
                    
                    <div class="project-section">
                        <h3>Results Achieved</h3>
                        <ul class="project-results">${resultsHTML}</ul>
                    </div>
                    
                    <div class="project-section">
                        <h3>Technologies Used</h3>
                        <div class="modal-tech-stack">${techHTML}</div>
                    </div>
                    
                    <div class="modal-actions">
                        <button class="glow-button" onclick="scrollToSection('contact'); closeModal();">Start Your Project</button>
                        <button class="glow-button button-small" onclick="closeModal()">Close</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
        document.body.style.overflow = 'auto';
    }
}

// Handle escape key for modals
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeModal();
    }
});

// Smooth scrolling for all anchor links
document.addEventListener('click', function(event) {
    if (event.target.tagName === 'A' && event.target.getAttribute('href').startsWith('#')) {
        event.preventDefault();
        const targetId = event.target.getAttribute('href').substring(1);
        scrollToSection(targetId);
    }
});

function showForgotPassword() {
    showMessageBox('Password Reset', 'In a real application, this would open a password reset form or redirect to a password reset page.');
}

function toggleTheme() {
    const body = document.body;
    const themeButton = document.querySelector('.theme-toggle');
    
    body.classList.toggle('light-theme');
    
    if (body.classList.contains('light-theme')) {
        themeButton.textContent = '☀️';
        // In a real application, you would save this preference
        localStorage.setItem('theme', 'light');
    } else {
        themeButton.textContent = '🌙';
        localStorage.setItem('theme', 'dark');
    }
}

// Function to get project suggestions using Gemini API
async function getProjectSuggestions() {
    const projectDetailsInput = document.getElementById('message');
    const projectDetails = projectDetailsInput.value.trim();
    const outputDiv = document.getElementById('project-suggestions-output');
    const suggestionsButton = document.getElementById('get-suggestions-button');
    const spinner = document.getElementById('suggestions-spinner');

    if (!projectDetails) {
        showMessageBox('Input Required', 'Please enter your project details before getting suggestions.');
        return;
    }

    // Show loading state
    suggestionsButton.classList.add('loading');
    spinner.style.display = 'inline-block';
    suggestionsButton.disabled = true;
    outputDiv.innerHTML = '<p style="color: var(--text-gray); margin-top: 1rem;">Generating suggestions, please wait...</p>';

    try {
        const prompt = `You are an expert technology consultant for InoxDev, a company specializing in Full Stack Development, DevSecOps Solutions, Cloud Services & Migration, Cybersecurity Audits, SaaS Product Development, UI/UX Design, Blockchain Development & Web3 Consulting, and AI/ML Consulting and Development.

A potential client has provided the following project details:
\`\`\`
${projectDetails}
\`\`\`

Please provide the following in markdown format:
1.  **Project Summary:** A concise summary of the client's project.
2.  **Recommended InoxDev Services:** List 2-3 services from our offerings that are most relevant to this project, explaining why.
3.  **Key Considerations:** Suggest 2-3 important technical or strategic considerations the client should keep in mind for this project.
4.  **Next Steps:** Suggest 1-2 immediate next steps for the client.

Keep the response professional, concise, and encouraging.`;

        let chatHistory = [];
        chatHistory.push({ role: "user", parts: [{ text: prompt }] });
        const payload = { contents: chatHistory };
        const apiKey = "AIzaSyCFl6EaYLi73u0gNxv2YL4-eP7K09t2Xwg"; // Leave as-is, Canvas will provide it
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

        let response;
        let retryCount = 0;
        const maxRetries = 3;
        const baseDelay = 1000; // 1 second

        while (retryCount < maxRetries) {
            try {
                response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    break; // Success, exit retry loop
                } else if (response.status === 429) {
                    // Too Many Requests, implement exponential backoff
                    retryCount++;
                    const delay = baseDelay * Math.pow(2, retryCount - 1);
                    console.warn(`Rate limit exceeded. Retrying in ${delay / 1000} seconds...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    // Other errors, throw to catch block
                    throw new Error(`API error: ${response.status} ${response.statusText}`);
                }
            } catch (fetchError) {
                console.error('Fetch error during retry:', fetchError);
                if (retryCount === maxRetries - 1) {
                    throw fetchError; // Re-throw if last retry fails
                }
                retryCount++;
                const delay = baseDelay * Math.pow(2, retryCount - 1);
                console.warn(`Network error. Retrying in ${delay / 1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        if (!response || !response.ok) {
            throw new Error('Failed to get a successful response after retries.');
        }

        const result = await response.json();
        
        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            const text = result.candidates[0].content.parts[0].text;
            // Ensure marked is available before parsing
            if (typeof marked !== 'undefined') {
                outputDiv.innerHTML = `<div class="llm-suggestions-box">${marked.parse(text)}</div>`;
            } else {
                outputDiv.innerHTML = '<p style="color: #ff6b6b; margin-top: 1rem;">Error: Markdown parser not loaded. Suggestions cannot be displayed.</p>';
                console.error('Marked.js library is not loaded.');
            }
        } else {
            showMessageBox('No Suggestions', 'Sorry, I could not generate suggestions. Please try again with different details.');
            console.error('Unexpected API response structure:', result);
        }
    } catch (error) {
        showMessageBox('API Error', 'An error occurred while getting suggestions. Please try again later.');
        console.error('Error calling Gemini API:', error);
    } finally {
        // Reset loading state
        suggestionsButton.classList.remove('loading');
        spinner.style.display = 'none';
        suggestionsButton.disabled = false;
    }
}
