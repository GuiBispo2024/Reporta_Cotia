const { sequelize } = require('../db/db');
const { DataTypes } = require('sequelize');

const Denuncia = sequelize.define('Denuncia', {
  titulo: {
    type: DataTypes.STRING(120),
    allowNull: false
  },
  localizacao: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  descricao: {
    type: DataTypes.STRING(2000),
    allowNull: false
  },
  categoria: {
    type: DataTypes.STRING(80),
    allowNull: false,
    defaultValue: 'Outros'
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: true
  },
  longitude: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: true
  },
  imageUrl: {
    type: DataTypes.STRING(1000),
    allowNull: true
  },
  imageUrls: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: []
  },
  status: {
    type: DataTypes.ENUM('pendente', 'aprovada', 'rejeitada'),
    defaultValue: 'pendente',
    allowNull: false
  },
  resolucaoStatus: {
    type: DataTypes.ENUM('aberta', 'em_andamento', 'resolvida'),
    defaultValue: 'aberta',
    allowNull: false
  },
  resolucaoAtualizadaEm: {
    type: DataTypes.DATE,
    allowNull: true
  },
  setorResponsavel: {
    type: DataTypes.STRING(120),
    allowNull: true
  },
  tituloOriginal: { type: DataTypes.STRING(120), allowNull: true },
  descricaoOriginal: { type: DataTypes.STRING(2000), allowNull: true },
  tituloCensurado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  descricaoCensurada: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  motivoRejeicao: { type: DataTypes.STRING(1000), allowNull: true }
});

module.exports = Denuncia;
