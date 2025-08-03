const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const { 
    User, 
    Service, 
    TeamMember, 
    Project, 
    Testimonial 
} = require('../models');

const seedData = async () => {
    try {
        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Clear existing data (be careful in production!)
        if (process.env.NODE_ENV === 'development') {
            await User.deleteMany({});
            await Service.deleteMany({});
            await TeamMember.deleteMany({});
            await Project.deleteMany({});
            await Testimonial.deleteMany({});
            console.log('Cleared existing data');
        }

        // Create admin user
        const adminUser = new User({
            name: 'InoxDev Admin',
            email: 'admin@inoxdev.com',
            password: 'AdminPass123!',
            role: 'admin'
        });
        await adminUser.save();
        console.log('Admin user created');

        // Create services
        const services = [
            {
                name: 'Full Stack Development',
                slug: 'fullstack',
                description: 'End-to-end web application development using modern frameworks and best practices for scalable, high-performance solutions.',
                features: [
                    'Modern React/Vue.js frontends',
                    'Scalable Node.js/Python backends',
                    'Database design and optimization',
                    'API development and integration',
                    'Performance optimization',
                    'Security implementation'
                ],
                technologies: ['React', 'Vue.js', 'Node.js', 'Python', 'MongoDB', 'PostgreSQL', 'Redis', 'GraphQL'],
                pricing: {
                    startingPrice: 250000,
                    currency: 'INR',
                    pricingModel: 'project-based'
                },
                icon: '⚡',
                order: 1
            },
            {
                name: 'DevSecOps Solutions',
                slug: 'devsecops',
                description: 'Integrate security into every stage of your development lifecycle with automated CI/CD pipelines and comprehensive monitoring.',
                features: [
                    'Automated CI/CD pipelines',
                    'Infrastructure as Code',
                    'Security scanning and monitoring',
                    'Container orchestration',
                    'Cloud infrastructure management',
                    '24/7 monitoring and alerting'
                ],
                technologies: ['Docker', 'Kubernetes', 'Jenkins', 'GitLab CI', 'Terraform', 'Ansible', 'Prometheus', 'Grafana'],
                pricing: {
                    startingPrice: 150000,
                    currency: 'INR',
                    pricingModel: 'subscription'
                },
                icon: '🔒',
                order: 2
            },
            {
                name: 'Cloud Services & Migration',
                slug: 'cloud',
                description: 'Expert cloud architecture design and migration services for AWS, Azure, and GCP with focus on cost optimization.',
                features: [
                    'Cloud architecture design',
                    'Migration planning and execution',
                    'Cost optimization strategies',
                    'Auto-scaling implementation',
                    'Disaster recovery setup',
                    'Multi-cloud strategies'
                ],
                technologies: ['AWS', 'Azure', 'Google Cloud', 'Serverless', 'Lambda', 'CloudFormation', 'CDN', 'Load Balancers'],
                pricing: {
                    startingPrice: 200000,
                    currency: 'INR',
                    pricingModel: 'project-based'
                },
                icon: '☁️',
                order: 3
            }
        ];

        await Service.insertMany(services);
        console.log('Services created');

        // Create team members
        const teamMembers = [
            {
                name: 'Mayank',
                role: 'Co-Founder & CEO',
                bio: 'A tech enthusiast with a relentless drive to innovate, Mayank is the strategic force behind InoxDev. With deep roots in full-stack development and DevSecOps, he leads the company\'s vision to build India\'s first complete tech ecosystem.',
                skills: ['Leadership', 'Full Stack Development', 'DevSecOps', 'Strategy'],
                experience: {
                    years: 8,
                    description: 'Led multiple successful startup initiatives'
                },
                avatar: 'MK',
                order: 1
            },
            {
                name: 'Dhruv Kumar Bhardwaj',
                role: 'Co-Founder & CTO',
                bio: 'Dhruv brings balance, precision, and execution power to InoxDev. With a passion for cybersecurity and cloud infrastructure, he ensures every client project runs smoothly and securely.',
                skills: ['Cybersecurity', 'Cloud Infrastructure', 'System Architecture', 'Operations'],
                experience: {
                    years: 7,
                    description: 'Expert in security and infrastructure management'
                },
                avatar: 'DK',
                order: 2
            }
        ];

        await TeamMember.insertMany(teamMembers);
        console.log('Team members created');

        // Create sample projects
        const projects = [
            {
                title: 'EduTech SaaS Platform',
                description: 'Comprehensive school management system serving 50+ institutions with 10,000+ students.',
                category: 'saas',
                technologies: ['React', 'Node.js', 'MongoDB', 'AWS'],
                features: [
                    'Attendance tracking',
                    'Digital report cards',
                    'Real-time parent notifications',
                    'Student performance analytics'
                ],
                challenges: 'The client needed to digitize their paper-based processes and provide real-time communication.',
                solutions: 'Built a multi-tenant SaaS platform with role-based access and automated reporting.',
                results: [
                    '40% reduction in administrative overhead',
                    '95% parent satisfaction rate',
                    '50+ schools onboarded',
                    '10,000+ active students'
                ],
                status: 'completed',
                isPublic: true,
                featured: true,
                startDate: new Date('2023-01-01'),
                endDate: new Date('2023-06-01')
            },
            {
                title: 'DevSecOps Monitoring Dashboard',
                description: 'Real-time security and deployment monitoring dashboard for a fintech startup.',
                category: 'devsecops',
                technologies: ['React', 'Python', 'Kubernetes', 'Grafana'],
                features: [
                    'Real-time monitoring',
                    'Security alerts',
                    'Deployment tracking',
                    'Compliance reporting'
                ],
                challenges: 'Need for unified visibility across 15+ security tools and compliance requirements.',
                solutions: 'Created centralized dashboard with custom integrations and automated compliance reporting.',
                results: [
                    '80% faster deployment cycles',
                    'Zero security incidents in 18 months',
                    '90% reduction in manual compliance work'
                ],
                status: 'completed',
                isPublic: true,
                featured: true,
                startDate: new Date('2023-03-01'),
                endDate: new Date('2023-08-01')
            }
        ];

        await Project.insertMany(projects);
        console.log('Projects created');

        // Create testimonials
        const testimonials = [
            {
                clientName: 'Vikram Patel',
                clientRole: 'CTO',
                company: 'TechStart Solutions',
                testimonial: 'InoxDev transformed our entire development process. Their DevSecOps implementation reduced our deployment time by 80% while maintaining the highest security standards.',
                rating: 5,
                isPublic: true,
                featured: true
            },
            {
                clientName: 'Anjali Gupta',
                clientRole: 'Founder',
                company: 'GreenTech Innovations',
                testimonial: 'The team\'s expertise in cloud migration saved us over ₹2 lakhs per month in infrastructure costs. Their proactive monitoring prevented three major outages.',
                rating: 5,
                isPublic: true,
                featured: true
            }
        ];

        await Testimonial.insertMany(testimonials);
        console.log('Testimonials created');

        console.log('Database seeded successfully!');
        
        // Log admin credentials
        console.log('\n=== ADMIN CREDENTIALS ===');
        console.log('Email: admin@inoxdev.com');
        console.log('Password: AdminPass123!');
        console.log('========================\n');

    } catch (error) {
        console.error('Seeding failed:', error);
    } finally {
        mongoose.connection.close();
    }
};

seedData();

// ecosystem.config.js (PM2 Configuration)
module.exports = {
    apps: [
        {
            name: 'inoxdev-backend',
            script: 'server.js',
            instances: process.env.NODE_ENV === 'production' ? 'max' : 1,
            exec_mode: process.env.NODE_ENV === 'production' ? 'cluster' : 'fork',
            watch: process.env.NODE_ENV === 'development',
            ignore_watch: ['node_modules', 'logs', 'uploads'],
            env: {
                NODE_ENV: 'development',
                PORT: 5000
            },
            env_production: {
                NODE_ENV: 'production',
                PORT: 5000
            },
            error_file: './logs/pm2-error.log',
            out_file: './logs/pm2-out.log',
            log_file: './logs/pm2-combined.log',
            time: true,
            max_memory_restart: '1G',
            node_args: '--max-old-space-size=1024'
        }
    ],
    
    deploy: {
        production: {
            user: 'deploy',
            host: ['your-server-ip'],
            ref: 'origin/main',
            repo: 'git@github.com:inoxdev/backend.git',
            path: '/var/www/inoxdev-backend',
            'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
            'pre-setup': 'apt update && apt install git -y'
        }
    }
};