module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('Users')
    if (!table.tokenVersion) {
      await queryInterface.addColumn('Users', 'tokenVersion', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      })
    }
  },
  async down(queryInterface) {
    const table = await queryInterface.describeTable('Users')
    if (table.tokenVersion) await queryInterface.removeColumn('Users', 'tokenVersion')
  }
}
