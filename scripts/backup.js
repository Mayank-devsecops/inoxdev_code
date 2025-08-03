const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const backup = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB for backup');

        const collections = [
            'users', 'contacts', 'projects', 'services', 
            'teammembers', 'testimonials', 'newsletters'
        ];

        const backupDir = path.join(__dirname, '../backups');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(backupDir, `backup-${timestamp}`);

        // Create backup directory
        await fs.mkdir(backupPath, { recursive: true });

        for (const collectionName of collections) {
            try {
                const collection = mongoose.connection.db.collection(collectionName);
                const documents = await collection.find({}).toArray();
                
                const filePath = path.join(backupPath, `${collectionName}.json`);
                await fs.writeFile(filePath, JSON.stringify(documents, null, 2));
                
                console.log(`Backed up ${collectionName}: ${documents.length} documents`);
            } catch (error) {
                console.log(`Collection ${collectionName} not found or empty`);
            }
        }

        // Create backup metadata
        const metadata = {
            timestamp: new Date().toISOString(),
            database: process.env.MONGODB_URI?.split('/').pop()?.split('?')[0],
            collections: collections.length,
            node_env: process.env.NODE_ENV
        };

        await fs.writeFile(
            path.join(backupPath, 'metadata.json'), 
            JSON.stringify(metadata, null, 2)
        );

        console.log(`Backup completed: ${backupPath}`);

        // Clean up old backups (keep last 30 days)
        const backupFiles = await fs.readdir(backupDir);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        
        for (const file of backupFiles) {
            if (file.startsWith('backup-')) {
                const filePath = path.join(backupDir, file);
                const stats = await fs.stat(filePath);
                
                if (stats.mtime < thirtyDaysAgo) {
                    await fs.rmdir(filePath, { recursive: true });
                    console.log(`Removed old backup: ${file}`);
                }
            }
        }

    } catch (error) {
        console.error('Backup failed:', error);
        process.exit(1);
    } finally {
        mongoose.connection.close();
    }
};

if (require.main === module) {
    backup();
}

module.exports = backup;