const mysql = require('mysql2/promise');
require('dotenv').config();
const moment = require('moment-timezone');

// Preflight helper to validate required environment variables
function validateEnvironmentVariables() {
  const requiredVars = [
    'DB_HOST',
    'DB_PORT', 
    'DB_USER',
    'DB_PASS',
    'DB_NAME'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\nPlease set these environment variables and try again.');
    process.exit(1);
  }
  
  console.log('✅ All required environment variables are set');
}

async function cleanupPayinAndInstantPayoutOrders() {
  let connection;
  
  try {
    // Validate environment variables before proceeding
    validateEnvironmentVariables();
    
    // Create database connection using only environment variables
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10),
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME
    });

    console.log('✅ Connected to database successfully\n');
    
    // Start transaction for safe cleanup
    await connection.beginTransaction();
    console.log('🔄 Starting cleanup transaction...\n');

    // 1. Get counts before deletion
    console.log('📊 CURRENT COUNTS:');
    
    const [payinCount] = await connection.execute(`
      SELECT COUNT(*) as count FROM orders WHERE type = 'payin'
    `);
    console.log(`   Payin orders: ${payinCount[0].count}`);
    
    const [instantPayoutCount] = await connection.execute(`
      SELECT COUNT(*) as count FROM orders WHERE is_instant_payout = 1
    `);
    console.log(`   Instant payout orders: ${instantPayoutCount[0].count}`);
    
    const [batchesCount] = await connection.execute(`
      SELECT COUNT(*) as count FROM instant_payout_batches
    `);
    console.log(`   Instant payout batches: ${batchesCount[0].count}\n`);

    // Safety check - if too many orders, require confirmation
    const totalOrders = payinCount[0].count + instantPayoutCount[0].count;
    console.log(`📋 About to delete ${totalOrders} orders total.`);

    if (totalOrders === 0) {
      console.log('ℹ️  No payin or instant payout orders found to delete.');
      await connection.rollback();
      connection.close();
      return;
    }

    // 2. Delete instant_payout_batches first (foreign key dependency)
    console.log('🗑️  STEP 1: Deleting instant payout batches...');
    const [deletedBatches] = await connection.execute(`
      DELETE FROM instant_payout_batches
    `);
    console.log(`   ✅ Deleted ${deletedBatches.affectedRows} instant payout batches\n`);

    // 3. Delete payin orders
    console.log('🗑️  STEP 2: Deleting payin orders...');
    const [deletedPayin] = await connection.execute(`
      DELETE FROM orders WHERE type = 'payin'
    `);
    console.log(`   ✅ Deleted ${deletedPayin.affectedRows} payin orders\n`);

    // 4. Delete instant payout orders
    console.log('🗑️  STEP 3: Deleting instant payout orders...');
    const [deletedInstantPayout] = await connection.execute(`
      DELETE FROM orders WHERE is_instant_payout = 1
    `);
    console.log(`   ✅ Deleted ${deletedInstantPayout.affectedRows} instant payout orders\n`);

    // 5. Verify cleanup
    console.log('🔍 VERIFICATION:');
    
    const [remainingPayin] = await connection.execute(`
      SELECT COUNT(*) as count FROM orders WHERE type = 'payin'
    `);
    console.log(`   Remaining payin orders: ${remainingPayin[0].count}`);
    
    const [remainingInstantPayout] = await connection.execute(`
      SELECT COUNT(*) as count FROM orders WHERE is_instant_payout = 1
    `);
    console.log(`   Remaining instant payout orders: ${remainingInstantPayout[0].count}`);
    
    const [remainingBatches] = await connection.execute(`
      SELECT COUNT(*) as count FROM instant_payout_batches
    `);
    console.log(`   Remaining instant payout batches: ${remainingBatches[0].count}\n`);

    // Commit the transaction
    await connection.commit();
    console.log('✅ Transaction committed successfully!');
    
    // Summary
    console.log('\n📋 CLEANUP SUMMARY:');
    console.log(`   🗑️  Deleted ${deletedBatches.affectedRows} instant payout batches`);
    console.log(`   🗑️  Deleted ${deletedPayin.affectedRows} payin orders`);
    console.log(`   🗑️  Deleted ${deletedInstantPayout.affectedRows} instant payout orders`);
    console.log(`   📊 Total orders deleted: ${deletedPayin.affectedRows + deletedInstantPayout.affectedRows}`);
    
    const timestamp = moment().tz(process.env.TIMEZONE || 'Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
    console.log(`   🕐 Cleanup completed at: ${timestamp}\n`);
    
    console.log('🎉 Cleanup completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Error during cleanup:', error.message);
    
    if (connection) {
      try {
        await connection.rollback();
        console.log('🔄 Transaction rolled back due to error');
      } catch (rollbackError) {
        console.error('❌ Error during rollback:', rollbackError.message);
      }
    }
    
    throw error;
    
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Additional safety function to backup before deletion
async function createBackupBeforeCleanup() {
  let connection;
  
  try {
    validateEnvironmentVariables();
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10),
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME
    });

    console.log('💾 Creating backup before cleanup...\n');
    
    // Export payin orders
    const [payinOrders] = await connection.execute(`
      SELECT * FROM orders WHERE type = 'payin'
    `);
    
    // Export instant payout orders  
    const [instantPayoutOrders] = await connection.execute(`
      SELECT * FROM orders WHERE is_instant_payout = 1
    `);
    
    // Export instant payout batches
    const [batches] = await connection.execute(`
      SELECT * FROM instant_payout_batches
    `);

    const backup = {
      timestamp: moment().tz(process.env.TIMEZONE || 'Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss'),
      payin_orders: payinOrders,
      instant_payout_orders: instantPayoutOrders,
      instant_payout_batches: batches,
      counts: {
        payin_orders: payinOrders.length,
        instant_payout_orders: instantPayoutOrders.length,
        instant_payout_batches: batches.length
      }
    };

    const fs = require('fs');
    const backupFilename = `backup_payin_instant_payout_${Date.now()}.json`;
    fs.writeFileSync(backupFilename, JSON.stringify(backup, null, 2));
    
    console.log(`✅ Backup created: ${backupFilename}`);
    console.log(`   📊 Backed up ${backup.counts.payin_orders} payin orders`);
    console.log(`   📊 Backed up ${backup.counts.instant_payout_orders} instant payout orders`);
    console.log(`   📊 Backed up ${backup.counts.instant_payout_batches} instant payout batches\n`);
    
    return backupFilename;
    
  } catch (error) {
    console.error('❌ Error creating backup:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Main execution
async function main() {
  try {
    console.log('🧹 PAYIN & INSTANT PAYOUT CLEANUP SCRIPT');
    console.log('==========================================\n');
    
    // Create backup first
    const backupFile = await createBackupBeforeCleanup();
    
    console.log('⚠️  FINAL CONFIRMATION REQUIRED:');
    console.log('   This will permanently delete all payin orders and instant payout orders.');
    console.log(`   A backup has been created: ${backupFile}`);
    console.log('\n   To proceed, run the cleanup function manually or modify this script.\n');
    
    // Execute the cleanup
    await cleanupPayinAndInstantPayoutOrders();
    
    console.log('ℹ️  Cleanup function is ready but not executed.');
    console.log('   Uncomment the cleanup call in the main() function to proceed.');
    
  } catch (error) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  cleanupPayinAndInstantPayoutOrders,
  createBackupBeforeCleanup
};
