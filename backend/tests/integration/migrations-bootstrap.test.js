const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');

test('all migrations bootstrap an empty database and enforce unique likes', async () => {
  const db = process.env.MIGRATIONS_TEST_URL
    ? new Sequelize(process.env.MIGRATIONS_TEST_URL, { logging: false })
    : new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
  const qi = db.getQueryInterface();
  try {
    if ((await qi.showAllTables()).length) throw new Error('Migration verification requires an empty disposable database.');
    const folder = path.join(__dirname, '../../migrations');
    for (const file of fs.readdirSync(folder).filter(file => file.endsWith('.js')).sort()) {
      await require(path.join(folder, file)).up(qi, Sequelize);
    }
    const tables = await qi.showAllTables();
    expect(tables).toEqual(expect.arrayContaining(['Users', 'Denuncia', 'Likes', 'AnalyticsFacts']));
    expect((await qi.describeTable('Denuncia')).status.allowNull).toBe(false);
    expect((await qi.showIndex('Likes')).find(index => index.name === 'likes_user_report_unique').unique).toBe(true);
    // Running the historical baseline on an existing schema never drops data.
    await require('../../migrations/202608220001-create-base-schema').up(qi, Sequelize);
    expect(await qi.showAllTables()).toEqual(tables);
  } finally { await db.close(); }
}, 30000);
