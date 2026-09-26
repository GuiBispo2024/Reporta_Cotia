'use strict';
const schema = require('../analytics/schema');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      for (const [name, attributes] of Object.entries(schema(Sequelize))) {
        await queryInterface.createTable(name, attributes, { transaction });
      }
      for (const table of ['AnalyticsFacts', 'AnalyticsAggregates']) {
        for (const fields of [['runId', 'day'], ['runId', 'categoria', 'day'], ['runId', 'bairro', 'day'], ['runId', 'status', 'day']]) {
          await queryInterface.addIndex(table, fields, { transaction });
        }
      }
      await queryInterface.addIndex('AnalyticsFacts', ['runId', 'hasIssues', 'denunciaId'], { transaction });
      await queryInterface.bulkInsert('AnalyticsStates', [{ id: 1, activeRunId: null, createdAt: new Date(), updatedAt: new Date() }], { transaction });
    });
  },
  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async transaction => {
      for (const name of ['AnalyticsAggregates', 'AnalyticsFacts', 'AnalyticsStates', 'AnalyticsRuns']) {
        await queryInterface.dropTable(name, { transaction });
      }
    });
  }
};
