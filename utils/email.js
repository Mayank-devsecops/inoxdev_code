const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs').promises; // Using fs.promises for async file operations
const handlebars = require('handlebars');
const logger = require('./logger');

class EmailService {
    constructor() {
        this.transporter = null;
        this.templates = new Map();
        // Call init as an async function and handle potential errors
        this.init().catch(error => {
            logger.error('EmailService constructor failed to initialize:', error);
            // Optionally re-throw or handle more gracefully if init failure is critical
        });
    }

    async init() {
        try {
            // Create transporter based on environment
            if (process.env.NODE_ENV === 'production') {
                // Production: Use service like SendGrid, Mailgun, or AWS SES
                // Corrected: nodemailer.createTransport
                this.transporter = nodemailer.createTransport({
                    service: process.env.EMAIL_SERVICE || 'gmail',
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS
                    },
                    secure: true, // For services like Gmail, usually true for port 465
                    port: 465 // Standard secure SMTP port
                });
            } else {
                // Development: Use Ethereal Email for testing
                const testAccount = await nodemailer.createTestAccount();
                
                // Corrected: nodemailer.createTransport
                this.transporter = nodemailer.createTransport({
                    host: 'smtp.ethereal.email',
                    port: 587,
                    secure: false, // Use false for port 587, true for port 465
                    auth: {
                        user: testAccount.user,
                        pass: testAccount.pass
                    }
                });
            }

            // Verify transporter configuration
            await this.transporter.verify();
            logger.info('Email service initialized successfully');

            // Load email templates
            await this.loadTemplates();

        } catch (error) {
            logger.error('Email service initialization failed:', error);
            // Re-throw the error so the constructor's catch block can handle it or the process can exit
            throw error; 
        }
    }

    async loadTemplates() {
        try {
            const templatesDir = path.join(__dirname, '../templates/email'); // Corrected path to 'email'
            const templateFiles = [
                'contact-notification.hbs',
                'contact-auto-reply.hbs',
                'welcome.hbs',
                'password-reset.hbs',
                'newsletter-welcome.hbs',
                'project-update.hbs'
            ];

            for (const templateFile of templateFiles) {
                const templatePath = path.join(templatesDir, templateFile);
                try {
                    const templateContent = await fs.readFile(templatePath, 'utf8');
                    const templateName = templateFile.replace('.hbs', '');
                    this.templates.set(templateName, handlebars.compile(templateContent));
                } catch (fileError) {
                    // Log the specific file error for debugging missing templates
                    logger.warn(`Template file not found or readable: ${templateFile}. Creating default template.`, fileError);
                    // Create default template if file doesn't exist
                    this.createDefaultTemplate(templateFile.replace('.hbs', ''));
                }
            }

            logger.info(`Loaded ${this.templates.size} email templates`);

        } catch (error) {
            logger.error('Template loading failed:', error);
            throw error; // Re-throw to propagate the error
        }
    }

    createDefaultTemplate(templateName) {
        let defaultTemplate;

        switch (templateName) {
            case 'contact-notification':
                defaultTemplate = `
                    <h2>New Contact Form Submission</h2>
                    <p><strong>Name:</strong> {{name}}</p>
                    <p><strong>Email:</strong> {{email}}</p>
                    <p><strong>Company:</strong> {{company}}</p>
                    <p><strong>Service:</strong> {{service}}</p>
                    <p><strong>Budget:</strong> {{budget}}</p>
                    <p><strong>Message:</strong></p>
                    <p>{{message}}</p>
                    <p><strong>Submitted:</strong> {{submittedAt}}</p>
                `;
                break;

            case 'contact-auto-reply':
                defaultTemplate = `
                    <h2>Thank you for contacting InoxDev!</h2>
                    <p>Dear {{name}},</p>
                    <p>We've received your inquiry about <strong>{{service}}</strong> and we're excited to help bring your project to life!</p>
                    <p>Our team will review your requirements and get back to you within 24 hours with:</p>
                    <ul>
                        <li>Detailed project analysis</li>
                        <li>Technology recommendations</li>
                        <li>Timeline and budget estimates</li>
                        <li>Next steps for your project</li>
                    </ul>
                    <p>In the meantime, feel free to explore our case studies and learn more about our services.</p>
                    <p>Best regards,<br>The InoxDev Team</p>
                    <p><small>Reference ID: {{contactId}}</small></p>
                `;
                break;

            case 'welcome':
                defaultTemplate = `
                    <h2>Welcome to the InoxDev Team!</h2>
                    <p>Dear {{name}},</p>
                    <p>Welcome to InoxDev! We're excited to have you join our team as a {{role}}.</p>
                    <p>You can now access our internal systems using your email address. Please log in and update your profile:</p>
                    <p><a href="{{loginUrl}}" style="background: #8A2BE2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Access Dashboard</a></p>
                    <p>If you have any questions, don't hesitate to reach out to your manager or HR.</p>
                    <p>Best regards,<br>The InoxDev Team</p>
                `;
                break;

            case 'password-reset':
                defaultTemplate = `
                    <h2>Password Reset Request</h2>
                    <p>Dear {{name}},</p>
                    <p>We received a request to reset your password for your InoxDev account.</p>
                    <p>Click the button below to reset your password (this link expires in {{expiresIn}}):</p>
                    <p><a href="{{resetUrl}}" style="background: #4169E1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
                    <p>If you didn't request this password reset, please ignore this email.</p>
                    <p>Best regards,<br>The InoxDev Team</p>
                `;
                break;

            case 'newsletter-welcome':
                defaultTemplate = `
                    <h2>Welcome to InoxDev Newsletter!</h2>
                    <p>Hi {{name}},</p>
                    <p>Thank you for subscribing to our newsletter! You'll now receive:</p>
                    <ul>
                        <li>Latest tech insights and industry trends</li>
                        <li>Behind-the-scenes project updates</li>
                        <li>Exclusive tips and best practices</li>
                        <li>Early access to our new services</li>
                    </ul>
                    <p>Stay tuned for amazing content!</p>
                    <p>Best regards,<br>The InoxDev Team</p>
                `;
                break;

            case 'project-update':
                defaultTemplate = `
                    <h2>Project Update: {{projectName}}</h2>
                    <p>Dear {{clientName}},</p>
                    <p>We have an update on your project: <strong>{{projectName}}</strong></p>
                    <p><strong>Status:</strong> {{status}}</p>
                    <p><strong>Progress:</strong> {{progress}}%</p>
                    <p><strong>Update:</strong></p>
                    <p>{{updateMessage}}</p>
                    <p><strong>Next Steps:</strong></p>
                    <p>{{nextSteps}}</p>
                    <p>Feel free to reach out if you have any questions!</p>
                    <p>Best regards,<br>{{teamMember}}<br>InoxDev</p>
                `;
                break;

            default:
                defaultTemplate = `
                    <h2>{{subject}}</h2>
                    <p>{{message}}</p>
                    <p>Best regards,<br>The InoxDev Team</p>
                `;
        }

        this.templates.set(templateName, handlebars.compile(defaultTemplate));
        logger.info(`Default template created for: ${templateName}`);
    }

    async sendEmail({ to, subject, template, data, html, text, attachments = [] }) {
        try {
            let emailHtml = html;
            let emailText = text;

            // Use template if provided
            if (template && this.templates.has(template)) {
                const templateFn = this.templates.get(template);
                emailHtml = templateFn(data || {});
                
                // Generate plain text version from HTML
                emailText = emailHtml.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
            }

            const mailOptions = {
                from: {
                    name: 'InoxDev',
                    address: process.env.EMAIL_FROM || 'noreply@inoxdev.com'
                },
                to,
                subject,
                html: emailHtml,
                text: emailText,
                attachments
            };

            // Ensure transporter is initialized before sending mail
            if (!this.transporter) {
                throw new Error('Email transporter not initialized.');
            }

            const result = await this.transporter.sendMail(mailOptions);

            if (process.env.NODE_ENV !== 'production') {
                logger.info('Email sent (Preview URL):', nodemailer.getTestMessageUrl(result));
            }

            logger.info(`Email sent successfully to ${to}: ${subject}`);
            return result;

        } catch (error) {
            logger.error('Email sending failed:', {
                to,
                subject,
                error: error.message,
                stack: error.stack // Include stack for more detail
            });
            throw error;
        }
    }

    async sendBulkEmails(emails) {
        const results = [];
        const batchSize = 10; // Send emails in batches to avoid rate limiting

        for (let i = 0; i < emails.length; i += batchSize) {
            const batch = emails.slice(i, i + batchSize);
            const batchPromises = batch.map(email => 
                this.sendEmail(email).catch(error => ({ error, email }))
            );

            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);

            // Wait between batches to respect rate limits
            if (i + batchSize < emails.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        const successful = results.filter(result => !result.error).length;
        const failed = results.filter(result => result.error).length;

        logger.info(`Bulk email sending completed: ${successful} successful, ${failed} failed`);
        return { successful, failed, results };
    }

    // Newsletter subscription confirmation
    async sendNewsletterWelcome(email, name) {
        return this.sendEmail({
            to: email,
            subject: 'Welcome to InoxDev Newsletter!',
            template: 'newsletter-welcome',
            data: { name: name || 'Subscriber' }
        });
    }

    // Contact form notifications
    async sendContactNotification(contactData) {
        return this.sendEmail({
            to: process.env.ADMIN_EMAIL || 'hello@inoxdev.com',
            subject: `New Contact: ${contactData.name} - ${contactData.service || 'General Inquiry'}`,
            template: 'contact-notification',
            data: contactData
        });
    }

    // Project update notifications
    async sendProjectUpdate(clientEmail, projectData) {
        return this.sendEmail({
            to: clientEmail,
            subject: `Project Update: ${projectData.projectName}`,
            template: 'project-update',
            data: projectData
        });
    }

    // Test email connectivity
    async testConnection() {
        try {
            // Ensure transporter is initialized before verifying
            if (!this.transporter) {
                throw new Error('Email transporter not initialized for testing connection.');
            }
            await this.transporter.verify();
            return { success: true, message: 'Email service is working correctly' };
        } catch (error) {
            logger.error('Email connection test failed:', error);
            return { success: false, message: error.message };
        }
    }
}

// Create singleton instance
const emailService = new EmailService();

// Export convenience function
const sendEmail = (options) => emailService.sendEmail(options);

module.exports = {
    EmailService,
    emailService,
    sendEmail
};
