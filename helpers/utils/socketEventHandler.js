const { getIO } = require("../../socket");
const logger = require("../../logger");

/**
 * Centralized socket event handler to avoid duplication
 * Handles all instant payout related socket events consistently
 */
class SocketEventHandler {
  
  /**
   * Emit batch update event to specific withdrawal room
   */
  static emitBatchUpdate(refID, batchData) {
    try {
      const io = getIO();
      const payoutRoom = `instant-withdraw-${refID}`;
      
      // Clean sensitive data before emitting
      const cleanBatchData = { ...batchData };
      delete cleanBatchData.pay_in_order_id;
      delete cleanBatchData.pay_in_ref_id;
      delete cleanBatchData.id;
      
      io.emit(payoutRoom, cleanBatchData);
      logger.info(`📡 Socket event emitted to ${payoutRoom}`);
    } catch (error) {
      logger.error(`Socket event emission failed for ${refID}:`, error);
    }
  }
  
  /**
   * Emit payout status update
   */
  static emitPayoutStatusUpdate(vendor, refID, paymentStatus, transactionID) {
    try {
      const io = getIO();
      const eventData = {
        refID,
        paymentStatus,
        transactionID
      };
      
      io.emit(`${vendor}-instant-payout-order-update-status-and-trnx`, eventData);
      logger.info(`📡 Payout status update emitted for ${refID}`);
    } catch (error) {
      logger.error(`Payout status update emission failed for ${refID}:`, error);
    }
  }
  
  /**
   * Emit instant payout status update for real-time synchronization
   */
  static emitInstantPayoutStatusUpdate(refID, status, amount, utr) {
    try {
      const io = getIO();
      const eventData = {
        refID,
        status,
        amount,
        utr
      };
      
      io.emit('instant-payout-status-update', eventData);
      logger.info(`📡 Instant payout status update emitted for ${refID}`);
    } catch (error) {
      logger.error(`Instant payout status update emission failed for ${refID}:`, error);
    }
  }
  
  /**
   * Emit customer UTR update
   */
  static emitCustomerUtrUpdate(vendor, refID, customerUtr) {
    try {
      const io = getIO();
      const updateData = {
        refID,
        customerUtr
      };
      
      io.emit(`${vendor}-customer-utr-updated`, updateData);
      logger.info(`📡 Customer UTR update emitted for ${refID}`);
    } catch (error) {
      logger.error(`Customer UTR update emission failed for ${refID}:`, error);
    }
  }
  
  /**
   * Emit order approval event
   */
  static emitOrderApproval(vendor, refID, transactionID) {
    try {
      const io = getIO();
      
      const approvedData = {
        refID,
        paymentStatus: "approved"
      };
      
      const changedData = {
        refID,
        paymentStatus: "approved",
        transactionID
      };
      
      io.emit(`${vendor}-order-approved-${refID}`, approvedData);
      io.emit(`${vendor}-order-update-status-and-trnx`, changedData);
      logger.info(`📡 Order approval events emitted for ${refID}`);
    } catch (error) {
      logger.error(`Order approval emission failed for ${refID}:`, error);
    }
  }
}

module.exports = SocketEventHandler;
