'use strict';

const INDEXES = [
  { name: 'denuncia_heatmap_coordinates', fields: ['latitude', 'longitude'] },
  { name: 'denuncia_heatmap_created_at', fields: ['createdAt'] },
  { name: 'denuncia_heatmap_status_created_at', fields: ['status', 'createdAt'] },
  { name: 'denuncia_heatmap_category_created_at', fields: ['categoria', 'createdAt'] },
  { name: 'denuncia_heatmap_sector_created_at', fields: ['setorResponsavel', 'createdAt'] },
  { name: 'denuncia_heatmap_neighborhood_created_at', fields: ['bairro', 'createdAt'] }
];

async function existingIndexNames(queryInterface) {
  return new Set((await queryInterface.showIndex('Denuncia')).map(index => index.name));
}

module.exports = {
  async up(queryInterface) {
    const existing = await existingIndexNames(queryInterface);
    for (const index of INDEXES) {
      if (existing.has(index.name)) continue;
      await queryInterface.addIndex('Denuncia', index.fields, { name: index.name });
    }
  },

  async down(queryInterface) {
    const existing = await existingIndexNames(queryInterface);
    for (const index of [...INDEXES].reverse()) {
      if (!existing.has(index.name)) continue;
      await queryInterface.removeIndex('Denuncia', index.name);
    }
  }
};

module.exports.INDEXES = INDEXES;
