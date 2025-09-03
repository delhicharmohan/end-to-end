const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

async function runCompletionMigration() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10),
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME
    });

    console.log('🔧 Running completion fields migration...');
    
    const migrationSQL = fs.readFileSync('./db_migrations/add_completion_fields.sql', 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = migrationSQL.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await connection.execute(statement);
          console.log('✅ Executed:', statement.substring(0, 80).replace(/\n/g, ' ') + '...');
        } catch (error) {
          if (error.code === 'ER_DUP_FIELDNAME' || error.code === 'ER_TABLE_EXISTS_ERROR') {
            console.log('ℹ️  Already exists, skipping:', statement.substring(0, 50).replace(/\n/g, ' ') + '...');
          } else {
            throw error;
          }
        }
      }
    }
    
    console.log('✅ Completion migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runCompletionMigration().catch(console.error);
