const poolPromise = require("../../db");
const logger = require("../../logger");

/**
 * Centralized balance update utility to prevent negative balances
 * Consolidates all instant_balance update logic with proper validation
 */
class BalanceUpdater {
  
  /**
   * Safely update instant balance with validation and rollback capability
   * @param {number} orderId - The payout order ID
   * @param {number} amount - Amount to deduct
   * @param {string} operation - Description of the operation for logging
   * @param {object} rollbackData - Optional rollback data if update fails
   * @returns {Promise<object>} Result with success status and details
   */
  static async updateInstantBalance(orderId, amount, operation = 'balance_update', rollbackData = null) {
    const pool = await poolPromise;
    
    try {
      // Get current balance first
      const [currentBalanceResult] = await pool.query(
        "SELECT instant_balance, refID FROM orders WHERE id = ?", 
        [orderId]
      );
      
      if (currentBalanceResult.length === 0) {
        throw new Error(`Order ${orderId} not found`);
      }
      
      const currentBalance = currentBalanceResult[0].instant_balance || 0;
      const refID = currentBalanceResult[0].refID;
      
      if (currentBalance < amount) {
        logger.error(`Insufficient instant balance for ${operation}. Required: ${amount}, Available: ${currentBalance}, OrderID: ${orderId}`);
        
        // Execute rollback if provided
        if (rollbackData && rollbackData.query && rollbackData.params) {
          await pool.query(rollbackData.query, rollbackData.params);
          logger.info(`Rollback executed for ${operation} on order ${orderId}`);
        }
        
        return {
          success: false,
          error: 'INSUFFICIENT_BALANCE',
          message: `Insufficient instant balance. Required: ${amount}, Available: ${currentBalance}`,
          currentBalance,
          requiredAmount: amount
        };
      }
      
      // Perform safe update with GREATEST(0, ...) and balance validation
      const updateQuery = `
        UPDATE orders 
        SET instant_paid = instant_paid + ?, 
            instant_balance = GREATEST(0, instant_balance - ?) 
        WHERE id = ? AND instant_balance >= ?
      `;
      
      const [updateResult] = await pool.query(updateQuery, [amount, amount, orderId, amount]);
      
      if (updateResult.affectedRows === 0) {
        logger.error(`Balance update failed - concurrent modification detected for order ${orderId}`);
        
        // Execute rollback if provided
        if (rollbackData && rollbackData.query && rollbackData.params) {
          await pool.query(rollbackData.query, rollbackData.params);
          logger.info(`Rollback executed for concurrent modification on order ${orderId}`);
        }
        
        return {
          success: false,
          error: 'CONCURRENT_MODIFICATION',
          message: 'Balance was modified by another process',
          currentBalance,
          requiredAmount: amount
        };
      }
      
      logger.info(`✅ Balance updated successfully for ${operation}. OrderID: ${orderId}, Amount: ${amount}, Previous Balance: ${currentBalance}`);
      
      return {
        success: true,
        orderId,
        refID,
        amount,
        previousBalance: currentBalance,
        newBalance: currentBalance - amount,
        operation
      };
      
    } catch (error) {
      logger.error(`Error updating instant balance for ${operation}:`, error);
      
      // Execute rollback if provided
      if (rollbackData && rollbackData.query && rollbackData.params) {
        try {
          await pool.query(rollbackData.query, rollbackData.params);
          logger.info(`Rollback executed for error in ${operation} on order ${orderId}`);
        } catch (rollbackError) {
          logger.error(`Rollback failed for ${operation} on order ${orderId}:`, rollbackError);
        }
      }
      
      throw error;
    }
  }
  
  /**
   * Update balance for batch creation (used in createOrder.js)
   */
  static async updateForBatchCreation(orderId, amount, batchUuid) {
    const rollbackData = {
      query: "DELETE FROM instant_payout_batches WHERE uuid = ?",
      params: [batchUuid]
    };
    
    return await this.updateInstantBalance(orderId, amount, 'batch_creation', rollbackData);
  }
  
  /**
   * Update balance for admin approval (used in approvePayOutOrder.js)
   */
  static async updateForAdminApproval(orderId, amount) {
    return await this.updateInstantBalance(orderId, amount, 'admin_approval');
  }
  
  /**
   * Update balance for screenshot upload (used in uploadScreenshot.js)
   */
  static async updateForScreenshotUpload(orderId, amount) {
    return await this.updateInstantBalance(orderId, amount, 'screenshot_upload');
  }
  
  /**
   * Update balance for reassignment (used in checkAndReAssignInstantPayout.js)
   */
  static async updateForReassignment(orderId, amount, batchUuid) {
    const rollbackData = {
      query: "DELETE FROM instant_payout_batches WHERE uuid = ?",
      params: [batchUuid]
    };
    
    return await this.updateInstantBalance(orderId, amount, 'reassignment', rollbackData);
  }
}

module.exports = BalanceUpdater;
