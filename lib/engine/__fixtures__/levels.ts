import type { Level } from '@/lib/schema/level'

// Test-only fixtures. These MIRROR the shape of the three MVP jobs (login auth
// bypass + search UNION extraction) so the engine can be exercised end-to-end,
// but they are NOT the real level content (P2 owns front-door/vault/blueprint
// JSON, real loot strings, and narrative). Keep loot values obviously synthetic.

// Front Door shape (K1): the template PROJECTS is_admin so a row-match win can
// read it. Benign credentials return 0 rows (anti-trivial); the tautology wins.
export function loginLevelFixture(): Level {
  return {
    schemaVersion: 1,
    id: 'fixture-login',
    order: 1,
    job: 'Fixture: Front Door',
    title: 'Fixture Login',
    technique: 'auth-bypass',
    difficulty: 'intro',
    brief: { handler: 'The Fixer', text: 'Get past the door.', objective: 'Land an admin row.' },
    debrief: {
      explanation: 'Raw input closes the string and comments out the password check.',
      vulnerableCode: { language: 'ts', code: "`... WHERE username = '${u}' AND password = '${p}'`" },
      secureCode: { language: 'ts', code: 'db.prepare(q).bind([u, p])' },
      takeaway: 'Bind parameters; never concatenate input.',
    },
    target: {
      appName: 'Fixture Admin',
      surface: 'login-form',
      fields: [
        { name: 'username', label: 'Username', type: 'text' },
        { name: 'password', label: 'Password', type: 'password' },
      ],
    },
    database: {
      schemaSql:
        'CREATE TABLE users(id INTEGER PRIMARY KEY, username TEXT UNIQUE, password TEXT, is_admin INTEGER);',
      seedSql:
        "INSERT INTO users(username, password, is_admin) VALUES ('admin', 's3cr3t-fixture', 1), ('bob', 'hunter2', 0);",
      visibleSchema: [{ table: 'users', columns: ['id', 'username', 'is_admin'] }],
    },
    query: {
      template:
        "SELECT id, username, is_admin FROM users WHERE username = '{{input:username}}' AND password = '{{input:password}}'",
      description: 'login check',
    },
    winCondition: { type: 'row-match', expect: [{ is_admin: 1 }], mode: 'subset' },
    hints: [
      { id: 'h1', text: 'What lives between the quotes?', cost: 50 },
      { id: 'h2', text: 'Comment injection ends a statement early.', cost: 150 },
      { id: 'h3', text: "Try: ' OR '1'='1' -- ", cost: 300 },
    ],
    expectedSolution: { inputs: { username: "' OR '1'='1' -- ", password: 'x' } },
  }
}

// Vault shape: 3-column SELECT + a KNOWN loot table to UNION-extract from. The
// hidden account_ref is the flag; benign search returns only products.
export function searchLevelFixture(): Level {
  return {
    schemaVersion: 1,
    id: 'fixture-search',
    order: 2,
    job: 'Fixture: The Vault',
    title: 'Fixture Search',
    technique: 'union-extraction',
    difficulty: 'medium',
    brief: { handler: 'The Fixer', text: 'Pull the account.', objective: 'Surface the loot.' },
    debrief: {
      explanation: 'A 3-column UNION appends attacker rows to the product result set.',
      vulnerableCode: { language: 'ts', code: "`... WHERE name LIKE '%${q}%'`" },
      secureCode: { language: 'ts', code: 'db.prepare(q).bind([`%${q}%`])' },
      takeaway: 'Bind the LIKE argument; never concatenate.',
    },
    target: {
      appName: 'Fixture Store',
      surface: 'search-box',
      fields: [{ name: 'q', label: 'Search', type: 'search' }],
    },
    database: {
      schemaSql:
        'CREATE TABLE products(id INTEGER PRIMARY KEY, name TEXT, price REAL);' +
        'CREATE TABLE offshore_accounts(id INTEGER PRIMARY KEY, holder_name TEXT, account_ref TEXT, balance_usd REAL);',
      seedSql:
        "INSERT INTO products(name, price) VALUES ('Widget', 9.99), ('Gadget', 19.99);" +
        "INSERT INTO offshore_accounts(holder_name, account_ref, balance_usd) VALUES ('Shell Corp', 'FIXTURE-VAULT-0000', 5000000);",
      visibleSchema: [{ table: 'products', columns: ['id', 'name', 'price'] }],
    },
    query: {
      template: "SELECT id, name, price FROM products WHERE name LIKE '%{{input:q}}%'",
      description: 'product search',
    },
    winCondition: { type: 'flag-in-result', flag: 'FIXTURE-VAULT-0000' },
    hints: [
      { id: 'h1', text: 'How many columns does the SELECT return?', cost: 50 },
      { id: 'h2', text: 'UNION SELECT must match the column count.', cost: 150 },
      { id: 'h3', text: "Try: ' UNION SELECT holder_name, account_ref, balance_usd FROM offshore_accounts -- ", cost: 300 },
    ],
    expectedSolution: {
      inputs: { q: "' UNION SELECT holder_name, account_ref, balance_usd FROM offshore_accounts -- " },
    },
  }
}
