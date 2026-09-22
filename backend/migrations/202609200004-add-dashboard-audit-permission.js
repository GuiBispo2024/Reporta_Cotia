'use strict';

const PERMISSION = {
  key: 'dashboard.audit.view',
  description: 'Consultar a auditoria de exportações do dashboard.'
};

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      const now = new Date();
      let [permission] = await queryInterface.sequelize.query(
        'SELECT "id" FROM "Permissions" WHERE "key" = :key',
        { replacements: { key: PERMISSION.key }, type: Sequelize.QueryTypes.SELECT, transaction }
      );
      if (!permission) {
        await queryInterface.bulkInsert('Permissions', [{ ...PERMISSION, createdAt: now, updatedAt: now }], { transaction });
        [permission] = await queryInterface.sequelize.query(
          'SELECT "id" FROM "Permissions" WHERE "key" = :key',
          { replacements: { key: PERMISSION.key }, type: Sequelize.QueryTypes.SELECT, transaction }
        );
      }
      const [admin] = await queryInterface.sequelize.query(
        'SELECT "id" FROM "Roles" WHERE "name" = :name',
        { replacements: { name: 'ADMIN' }, type: Sequelize.QueryTypes.SELECT, transaction }
      );
      if (admin && permission) {
        const [assignment] = await queryInterface.sequelize.query(
          'SELECT "roleId" FROM "RolePermissions" WHERE "roleId" = :roleId AND "permissionId" = :permissionId',
          { replacements: { roleId: admin.id, permissionId: permission.id }, type: Sequelize.QueryTypes.SELECT, transaction }
        );
        if (!assignment) {
          await queryInterface.bulkInsert('RolePermissions', [{
            roleId: admin.id,
            permissionId: permission.id,
            createdAt: now,
            updatedAt: now
          }], { transaction });
        }
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      const [permission] = await queryInterface.sequelize.query(
        'SELECT "id" FROM "Permissions" WHERE "key" = :key',
        { replacements: { key: PERMISSION.key }, type: Sequelize.QueryTypes.SELECT, transaction }
      );
      if (!permission) return;
      await queryInterface.bulkDelete('RolePermissions', { permissionId: permission.id }, { transaction });
      await queryInterface.bulkDelete('Permissions', { id: permission.id }, { transaction });
    });
  }
};
