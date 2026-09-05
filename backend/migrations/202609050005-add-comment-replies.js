'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('Comentarios');
    if (!table.parentCommentId) {
      await queryInterface.addColumn('Comentarios', 'parentCommentId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Comentarios', key: 'id' },
        onDelete: 'CASCADE'
      });
      await queryInterface.addIndex('Comentarios', ['parentCommentId']);
    }
  },
  async down(queryInterface) {
    const table = await queryInterface.describeTable('Comentarios');
    if (table.parentCommentId) await queryInterface.removeColumn('Comentarios', 'parentCommentId');
  }
};
