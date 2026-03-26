const createSubscriptionsLedgerTable = `
  CREATE TABLE IF NOT EXISTS subscriptions_ledger (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    mongo_subscription_id VARCHAR(40) NOT NULL,
    mongo_user_id VARCHAR(40) NOT NULL,
    plan VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    billing_cycle VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    started_at DATETIME NOT NULL,
    renewal_date DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB;
`;

const createSubscriptionsTable = `
  CREATE TABLE IF NOT EXISTS subscriptions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(40) NOT NULL UNIQUE,
    plan_type ENUM('monthly', 'yearly') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'GBP',
    status ENUM('active', 'inactive', 'cancelled') NOT NULL DEFAULT 'active',
    started_at DATETIME NOT NULL,
    end_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_subscriptions_user_status (user_id, status)
  ) ENGINE=InnoDB;
`;

const createPrizeEntriesAuditTable = `
  CREATE TABLE IF NOT EXISTS prize_entries_audit (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    mongo_entry_id VARCHAR(40) NOT NULL,
    mongo_user_id VARCHAR(40) NOT NULL,
    month_key VARCHAR(20) NOT NULL,
    entry_count INT NOT NULL,
    source VARCHAR(20) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB;
`;

const createCharityLedgerTable = `
  CREATE TABLE IF NOT EXISTS charity_ledger (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    mongo_contribution_id VARCHAR(40) NOT NULL,
    mongo_user_id VARCHAR(40) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    cause VARCHAR(255) NOT NULL,
    source VARCHAR(20) NOT NULL,
    contributed_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB;
`;

const initMySQLSchema = async (pool) => {
  await pool.query(createSubscriptionsTable);
  await pool.query(createSubscriptionsLedgerTable);
  await pool.query(createPrizeEntriesAuditTable);
  await pool.query(createCharityLedgerTable);
};

module.exports = {
  initMySQLSchema
};
