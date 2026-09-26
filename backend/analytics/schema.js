// Shared by migrations and models so SQLite tests exercise the production shape.
module.exports = DataTypes => {
  const integer = (defaultValue = 0) => ({ type: DataTypes.INTEGER, allowNull: false, defaultValue });
  const dimensions = () => ({
    day: { type: DataTypes.DATEONLY, allowNull: true },
    categoria: { type: DataTypes.STRING(80), allowNull: true },
    bairro: { type: DataTypes.STRING(120), allowNull: true },
    setorResponsavel: { type: DataTypes.STRING(120), allowNull: true },
    status: { type: DataTypes.STRING(20), allowNull: true },
    resolucaoStatus: { type: DataTypes.STRING(20), allowNull: true }
  });
  const timestamps = () => ({ createdAt: { type: DataTypes.DATE, allowNull: false }, updatedAt: { type: DataTypes.DATE, allowNull: false } });
  const id = () => ({ type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false });
  return {
    AnalyticsRuns: {
      id: id(), status: { type: DataTypes.STRING(20), allowNull: false },
      sourceCount: integer(), validCount: integer(), issueCount: integer(),
      startedAt: { type: DataTypes.DATE, allowNull: false },
      completedAt: { type: DataTypes.DATE, allowNull: true },
      errorCode: { type: DataTypes.STRING(80), allowNull: true },
      ...timestamps()
    },
    AnalyticsStates: {
      id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
      activeRunId: { type: DataTypes.INTEGER, allowNull: true }, ...timestamps()
    },
    AnalyticsFacts: {
      denunciaId: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
      runId: { type: DataTypes.INTEGER, allowNull: false }, ...dimensions(),
      eligible: { type: DataTypes.BOOLEAN, allowNull: false },
      hasIssues: { type: DataTypes.BOOLEAN, allowNull: false },
      issues: { type: DataTypes.JSON, allowNull: false },
      moderationHours: { type: DataTypes.DOUBLE, allowNull: true },
      resolutionHours: { type: DataTypes.DOUBLE, allowNull: true }, ...timestamps()
    },
    AnalyticsAggregates: {
      key: { type: DataTypes.STRING(64), primaryKey: true, allowNull: false },
      runId: { type: DataTypes.INTEGER, allowNull: false }, ...dimensions(),
      sourceCount: integer(), total: integer(), issueCount: integer(),
      issues: { type: DataTypes.JSON, allowNull: false },
      moderationSum: { type: DataTypes.DOUBLE, allowNull: false, defaultValue: 0 },
      moderationCount: integer(),
      resolutionSum: { type: DataTypes.DOUBLE, allowNull: false, defaultValue: 0 },
      resolutionCount: integer(), ...timestamps()
    }
  };
};
